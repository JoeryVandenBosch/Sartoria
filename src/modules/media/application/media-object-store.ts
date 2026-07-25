import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";

export type MediaUploadPolicy = Readonly<{
  url: string;
  fields: Readonly<Record<string, string>>;
  expiresAt: string;
  maximumBytes: number;
}>;

export type QuarantineObjectMetadata = Readonly<{
  key: string;
  sizeBytes: number;
  declaredContentType: string | null;
  mediaId: string | null;
  checksum: string | null;
}>;

export interface MediaObjectReader {
  readPrefix(key: string, maximumBytes: number): Promise<Uint8Array>;
}

export interface MediaObjectStore extends MediaObjectReader {
  createQuarantineUploadPolicy(input: Readonly<{
    mediaId: string;
    key: string;
    declaredContentType: WardrobeMediaType;
    maximumBytes: number;
    expiresInSeconds: number;
  }>): Promise<MediaUploadPolicy>;

  inspectQuarantineObject(key: string): Promise<QuarantineObjectMetadata | null>;

  promoteQuarantineObject(input: Readonly<{
    quarantineKey: string;
    privateKey: string;
    detectedContentType: WardrobeMediaType;
  }>): Promise<void>;

  createPrivateReadUrl(input: Readonly<{
    key: string;
    contentType: WardrobeMediaType;
    expiresInSeconds: number;
  }>): Promise<string>;

  deleteObjects(keys: readonly string[]): Promise<void>;
}
