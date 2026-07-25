import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

const createPresignedPostMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: createPresignedPostMock,
}));

import {
  MediaStorageConfigurationError,
  readMediaStorageConfiguration,
  S3MediaObjectStore,
} from "@/modules/media/infrastructure/s3-media-object-store";

afterEach(() => {
  vi.unstubAllEnvs();
  createPresignedPostMock.mockReset();
});

describe("S3 private media object store", () => {
  it("creates an exact-key five-minute quarantine policy with size and metadata controls", async () => {
    createPresignedPostMock.mockResolvedValue({
      url: "https://storage.example.test",
      fields: { key: "quarantine/media-1" },
    });

    const now = new Date("2026-07-25T12:00:00.000Z");
    const store = new S3MediaObjectStore(
      new S3Client({ region: "eu-west-1" }),
      {
        bucket: "private-media",
        region: "eu-west-1",
        endpoint: undefined,
        forcePathStyle: false,
        serverSideEncryption: "AES256",
      },
      () => now,
    );

    const policy = await store.createQuarantineUploadPolicy({
      mediaId: "media-1",
      key: "quarantine/media-1",
      declaredContentType: "image/jpeg",
      maximumBytes: 20 * 1024 * 1024,
      expiresInSeconds: 300,
    });

    const options = createPresignedPostMock.mock.calls[0]?.[1] as {
      Bucket: string;
      Key: string;
      Expires: number;
      Fields: Record<string, string>;
      Conditions: unknown[];
    };

    expect(options).toMatchObject({
      Bucket: "private-media",
      Key: "quarantine/media-1",
      Expires: 300,
      Fields: {
        "Content-Type": "image/jpeg",
        "x-amz-meta-media-id": "media-1",
        "x-amz-server-side-encryption": "AES256",
      },
    });
    expect(options.Conditions).toContainEqual(["content-length-range", 1, 20 * 1024 * 1024]);
    expect(options.Conditions).toContainEqual({ "Content-Type": "image/jpeg" });
    expect(options.Conditions).toContainEqual({ "x-amz-meta-media-id": "media-1" });
    expect(policy.expiresAt).toBe("2026-07-25T12:05:00.000Z");
  });

  it("rejects upload and read operations outside protected prefixes", async () => {
    const store = new S3MediaObjectStore(
      new S3Client({ region: "eu-west-1" }),
      {
        bucket: "private-media",
        region: "eu-west-1",
        endpoint: undefined,
        forcePathStyle: false,
        serverSideEncryption: undefined,
      },
    );

    await expect(
      store.createQuarantineUploadPolicy({
        mediaId: "media-1",
        key: "private/media-1",
        declaredContentType: "image/jpeg",
        maximumBytes: 1024,
        expiresInSeconds: 300,
      }),
    ).rejects.toThrow("quarantine prefix");

    await expect(
      store.createPrivateReadUrl({
        key: "quarantine/media-1",
        contentType: "image/jpeg",
        expiresInSeconds: 300,
      }),
    ).rejects.toThrow("private prefix");
  });

  it("fails closed when required storage configuration is absent", () => {
    vi.stubEnv("MEDIA_S3_BUCKET", "");
    vi.stubEnv("MEDIA_S3_REGION", "");

    expect(() => readMediaStorageConfiguration()).toThrow(MediaStorageConfigurationError);

    vi.stubEnv("MEDIA_S3_BUCKET", "private-media");
    expect(() => readMediaStorageConfiguration()).toThrow("MEDIA_S3_REGION is required");
  });
});
