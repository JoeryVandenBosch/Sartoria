import type {
  MediaObjectStore,
  MediaUploadPolicy,
  QuarantineObjectMetadata,
} from "@/modules/media/application/media-object-store";
import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";

type DevelopmentObject = Readonly<{
  key: string;
  bytes: Uint8Array;
  contentType: string;
  mediaId: string;
}>;

type SartoriaGlobal = typeof globalThis & {
  sartoriaDevelopmentMediaObjects?: Map<string, DevelopmentObject>;
};

const sartoriaGlobal = globalThis as SartoriaGlobal;
const objects =
  sartoriaGlobal.sartoriaDevelopmentMediaObjects ?? new Map<string, DevelopmentObject>();

if (process.env.NODE_ENV !== "production") {
  sartoriaGlobal.sartoriaDevelopmentMediaObjects = objects;
}

export function assertDevelopmentMediaEnabled(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development media storage is disabled in production.");
  }
}

export function storeDevelopmentUpload(input: Readonly<{
  key: string;
  bytes: Uint8Array;
  contentType: string;
  mediaId: string;
}>): void {
  assertDevelopmentMediaEnabled();

  if (input.key !== `quarantine/${input.mediaId}`) {
    throw new Error("Development upload key does not match the media identifier.");
  }

  objects.set(input.key, Object.freeze({ ...input }));
}

export function getDevelopmentMediaObject(key: string): DevelopmentObject | null {
  assertDevelopmentMediaEnabled();
  return objects.get(key) ?? null;
}

export class DevelopmentMediaObjectStore implements MediaObjectStore {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async createQuarantineUploadPolicy(input: Readonly<{
    mediaId: string;
    key: string;
    declaredContentType: WardrobeMediaType;
    maximumBytes: number;
    expiresInSeconds: number;
  }>): Promise<MediaUploadPolicy> {
    assertDevelopmentMediaEnabled();

    return {
      url: `/api/development/media-upload/${encodeURIComponent(input.mediaId)}`,
      fields: {
        key: input.key,
        "Content-Type": input.declaredContentType,
        "x-sartoria-media-id": input.mediaId,
      },
      expiresAt: new Date(this.now().getTime() + input.expiresInSeconds * 1_000).toISOString(),
      maximumBytes: input.maximumBytes,
    };
  }

  async inspectQuarantineObject(key: string): Promise<QuarantineObjectMetadata | null> {
    const object = getDevelopmentMediaObject(key);
    if (!object) {
      return null;
    }

    return {
      key,
      sizeBytes: object.bytes.byteLength,
      declaredContentType: object.contentType,
      mediaId: object.mediaId,
      checksum: null,
    };
  }

  async readPrefix(key: string, maximumBytes: number): Promise<Uint8Array> {
    const object = getDevelopmentMediaObject(key);
    return object ? object.bytes.slice(0, maximumBytes) : new Uint8Array();
  }

  async streamObject(key: string): Promise<AsyncIterable<Uint8Array>> {
    const object = getDevelopmentMediaObject(key);
    if (!object) {
      throw new Error("Development media object was not found.");
    }

    return (async function* stream() {
      yield object.bytes;
    })();
  }

  async promoteQuarantineObject(input: Readonly<{
    quarantineKey: string;
    privateKey: string;
    detectedContentType: WardrobeMediaType;
  }>): Promise<void> {
    const object = getDevelopmentMediaObject(input.quarantineKey);
    if (!object) {
      throw new Error("Development quarantine object was not found.");
    }

    objects.set(
      input.privateKey,
      Object.freeze({
        ...object,
        key: input.privateKey,
        contentType: input.detectedContentType,
      }),
    );
    objects.delete(input.quarantineKey);
  }

  async createPrivateReadUrl(input: Readonly<{
    key: string;
    contentType: WardrobeMediaType;
    expiresInSeconds: number;
  }>): Promise<string> {
    assertDevelopmentMediaEnabled();

    const mediaId = input.key.startsWith("private/") ? input.key.slice("private/".length) : "";
    if (!mediaId || !objects.has(input.key)) {
      throw new Error("Development private media object was not found.");
    }

    return `/api/development/media/${encodeURIComponent(mediaId)}`;
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    assertDevelopmentMediaEnabled();
    for (const key of keys) {
      objects.delete(key);
    }
  }
}

export const developmentMediaObjectStore = new DevelopmentMediaObjectStore();
