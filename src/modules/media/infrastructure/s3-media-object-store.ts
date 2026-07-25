import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  type ObjectIdentifier,
  type ServerSideEncryption,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  MediaObjectStore,
  MediaUploadPolicy,
  QuarantineObjectMetadata,
} from "@/modules/media/application/media-object-store";
import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";

export class MediaStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageConfigurationError";
  }
}

export type MediaStorageConfiguration = Readonly<{
  bucket: string;
  region: string;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  serverSideEncryption: ServerSideEncryption | undefined;
}>;

export function readMediaStorageConfiguration(): MediaStorageConfiguration {
  const bucket = process.env.MEDIA_S3_BUCKET?.trim();
  const region = process.env.MEDIA_S3_REGION?.trim();

  if (!bucket) {
    throw new MediaStorageConfigurationError("MEDIA_S3_BUCKET is required for private media.");
  }

  if (!region) {
    throw new MediaStorageConfigurationError("MEDIA_S3_REGION is required for private media.");
  }

  const encryption = process.env.MEDIA_S3_SERVER_SIDE_ENCRYPTION?.trim();
  if (encryption && encryption !== "AES256" && encryption !== "aws:kms") {
    throw new MediaStorageConfigurationError(
      "MEDIA_S3_SERVER_SIDE_ENCRYPTION must be AES256 or aws:kms when configured.",
    );
  }

  return {
    bucket,
    region,
    endpoint: process.env.MEDIA_S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE === "true",
    serverSideEncryption: encryption as ServerSideEncryption | undefined,
  };
}

function copySource(bucket: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `/${encodeURIComponent(bucket)}/${encodedKey}`;
}

export class S3MediaObjectStore implements MediaObjectStore {
  constructor(
    private readonly client: S3Client,
    private readonly configuration: MediaStorageConfiguration,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createQuarantineUploadPolicy(input: Readonly<{
    mediaId: string;
    key: string;
    declaredContentType: WardrobeMediaType;
    maximumBytes: number;
    expiresInSeconds: number;
  }>): Promise<MediaUploadPolicy> {
    if (!input.key.startsWith("quarantine/")) {
      throw new Error("Upload policies may only target the quarantine prefix.");
    }

    const encryptionFields = this.configuration.serverSideEncryption
      ? { "x-amz-server-side-encryption": this.configuration.serverSideEncryption }
      : {};

    const policy = await createPresignedPost(this.client, {
      Bucket: this.configuration.bucket,
      Key: input.key,
      Expires: input.expiresInSeconds,
      Fields: {
        "Content-Type": input.declaredContentType,
        "x-amz-meta-media-id": input.mediaId,
        ...encryptionFields,
      },
      Conditions: [
        ["content-length-range", 1, input.maximumBytes],
        ["eq", "$Content-Type", input.declaredContentType],
        ["eq", "$x-amz-meta-media-id", input.mediaId],
        ...Object.entries(encryptionFields).map(([field, value]) => ["eq", `$${field}`, value]),
      ],
    });

    return {
      url: policy.url,
      fields: policy.fields,
      expiresAt: new Date(this.now().getTime() + input.expiresInSeconds * 1_000).toISOString(),
      maximumBytes: input.maximumBytes,
    };
  }

  async inspectQuarantineObject(key: string): Promise<QuarantineObjectMetadata | null> {
    if (!key.startsWith("quarantine/")) {
      throw new Error("Only quarantine objects can be inspected through this operation.");
    }

    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.configuration.bucket,
          Key: key,
        }),
      );

      return {
        key,
        sizeBytes: result.ContentLength ?? 0,
        declaredContentType: result.ContentType ?? null,
        mediaId: result.Metadata?.["media-id"] ?? null,
        checksum: result.ChecksumSHA256 ?? result.ETag ?? null,
      };
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async readPrefix(key: string, maximumBytes: number): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.configuration.bucket,
        Key: key,
        Range: `bytes=0-${Math.max(0, maximumBytes - 1)}`,
      }),
    );

    if (!result.Body) {
      return new Uint8Array();
    }

    return result.Body.transformToByteArray();
  }

  async promoteQuarantineObject(input: Readonly<{
    quarantineKey: string;
    privateKey: string;
    detectedContentType: WardrobeMediaType;
  }>): Promise<void> {
    if (!input.quarantineKey.startsWith("quarantine/") || !input.privateKey.startsWith("private/")) {
      throw new Error("Invalid media promotion prefixes.");
    }

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.configuration.bucket,
        CopySource: copySource(this.configuration.bucket, input.quarantineKey),
        Key: input.privateKey,
        ContentType: input.detectedContentType,
        MetadataDirective: "REPLACE",
        Metadata: {
          state: "ready",
        },
        ServerSideEncryption: this.configuration.serverSideEncryption,
      }),
    );

    await this.deleteObjects([input.quarantineKey]);
  }

  async createPrivateReadUrl(input: Readonly<{
    key: string;
    contentType: WardrobeMediaType;
    expiresInSeconds: number;
  }>): Promise<string> {
    if (!input.key.startsWith("private/")) {
      throw new Error("Read URLs may only target the private prefix.");
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.configuration.bucket,
        Key: input.key,
        ResponseContentDisposition: "inline",
        ResponseContentType: input.contentType,
      }),
      { expiresIn: input.expiresInSeconds },
    );
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    const objects: ObjectIdentifier[] = [...new Set(keys)]
      .filter((key) => key.startsWith("quarantine/") || key.startsWith("private/"))
      .map((Key) => ({ Key }));

    if (objects.length === 0) {
      return;
    }

    const result = await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.configuration.bucket,
        Delete: {
          Objects: objects,
          Quiet: true,
        },
      }),
    );

    if (result.Errors && result.Errors.length > 0) {
      throw new Error(`Object storage failed to delete ${result.Errors.length} media object(s).`);
    }
  }
}

export function createS3MediaObjectStore(): S3MediaObjectStore {
  const configuration = readMediaStorageConfiguration();
  const client = new S3Client({
    region: configuration.region,
    endpoint: configuration.endpoint,
    forcePathStyle: configuration.forcePathStyle,
  });

  return new S3MediaObjectStore(client, configuration);
}
