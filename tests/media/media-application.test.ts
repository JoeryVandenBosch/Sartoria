import { describe, expect, it } from "vitest";

import { completeWardrobeMediaUpload } from "@/modules/media/application/complete-wardrobe-media-upload";
import { deleteWardrobeMediaForOwner } from "@/modules/media/application/delete-wardrobe-media";
import { initiateWardrobeMediaUpload } from "@/modules/media/application/initiate-wardrobe-media-upload";
import type {
  MediaObjectStore,
  MediaUploadPolicy,
  QuarantineObjectMetadata,
} from "@/modules/media/application/media-object-store";
import type {
  MediaScanner,
  MediaScanResult,
} from "@/modules/media/application/media-scanner";
import { processWardrobeMedia } from "@/modules/media/application/process-wardrobe-media";
import { InMemoryWardrobeMediaRepository } from "@/modules/media/infrastructure/in-memory-wardrobe-media-repository";
import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

const now = new Date("2026-07-25T12:00:00.000Z");
const wardrobeItem: WardrobeItem = {
  id: "item-1",
  ownerId: "owner-1",
  category: "tailoring",
  name: "Navy knitted blazer",
  brand: "Gran Sasso",
  primaryColor: "Navy",
  ownershipStatus: "owned",
  fitNotes: null,
  createdAt: now.toISOString(),
};

class FakeObjectStore implements MediaObjectStore {
  inspected: QuarantineObjectMetadata | null = null;
  deleted: string[] = [];
  promoted: Readonly<{
    quarantineKey: string;
    privateKey: string;
    detectedContentType: WardrobeMediaType;
  }> | null = null;
  uploadPolicyInput: Readonly<{
    mediaId: string;
    key: string;
    declaredContentType: WardrobeMediaType;
    maximumBytes: number;
    expiresInSeconds: number;
  }> | null = null;

  async createQuarantineUploadPolicy(input: Readonly<{
    mediaId: string;
    key: string;
    declaredContentType: WardrobeMediaType;
    maximumBytes: number;
    expiresInSeconds: number;
  }>): Promise<MediaUploadPolicy> {
    this.uploadPolicyInput = input;
    return {
      url: "https://storage.example.test/upload",
      fields: {
        key: input.key,
        "Content-Type": input.declaredContentType,
        "x-amz-meta-media-id": input.mediaId,
      },
      expiresAt: new Date(now.getTime() + input.expiresInSeconds * 1_000).toISOString(),
      maximumBytes: input.maximumBytes,
    };
  }

  async inspectQuarantineObject(): Promise<QuarantineObjectMetadata | null> {
    return this.inspected;
  }

  async readPrefix(): Promise<Uint8Array> {
    return new Uint8Array([0xff, 0xd8, 0xff]);
  }

  async streamObject(): Promise<AsyncIterable<Uint8Array>> {
    return (async function* stream() {
      yield new Uint8Array([0xff, 0xd8, 0xff]);
    })();
  }

  async promoteQuarantineObject(input: Readonly<{
    quarantineKey: string;
    privateKey: string;
    detectedContentType: WardrobeMediaType;
  }>): Promise<void> {
    this.promoted = input;
  }

  async createPrivateReadUrl(): Promise<string> {
    return "https://storage.example.test/private";
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    this.deleted.push(...keys);
  }
}

class FixedScanner implements MediaScanner {
  constructor(private readonly result: MediaScanResult) {}

  async scan(): Promise<MediaScanResult> {
    return this.result;
  }
}

async function configuredWardrobeRepository(): Promise<InMemoryWardrobeItemRepository> {
  const repository = new InMemoryWardrobeItemRepository();
  await repository.save(wardrobeItem);
  return repository;
}

async function initiatedUpload() {
  const wardrobeRepository = await configuredWardrobeRepository();
  const mediaRepository = new InMemoryWardrobeMediaRepository();
  const objectStore = new FakeObjectStore();
  const initiated = await initiateWardrobeMediaUpload(
    {
      ownerId: wardrobeItem.ownerId,
      wardrobeItemId: wardrobeItem.id,
      originalFilename: "blazer.jpg",
      declaredContentType: "image/jpeg",
    },
    {
      wardrobeRepository,
      mediaRepository,
      objectStore,
      createId: () => "media-1",
      now: () => now,
    },
  );

  return { initiated, mediaRepository, objectStore };
}

describe("private media application", () => {
  it("denies upload initiation for an item outside the owner boundary", async () => {
    const wardrobeRepository = await configuredWardrobeRepository();

    await expect(
      initiateWardrobeMediaUpload(
        {
          ownerId: "owner-2",
          wardrobeItemId: wardrobeItem.id,
          originalFilename: "private.jpg",
          declaredContentType: "image/jpeg",
        },
        {
          wardrobeRepository,
          mediaRepository: new InMemoryWardrobeMediaRepository(),
          objectStore: new FakeObjectStore(),
          createId: () => "media-denied",
          now: () => now,
        },
      ),
    ).rejects.toMatchObject({ name: "WardrobeMediaAuthorizationError" });
  });

  it("creates a five-minute exact-key upload policy", async () => {
    const { initiated, objectStore } = await initiatedUpload();

    expect(initiated.media.quarantineKey).toBe("quarantine/media-1");
    expect(objectStore.uploadPolicyInput).toMatchObject({
      mediaId: "media-1",
      key: "quarantine/media-1",
      declaredContentType: "image/jpeg",
      expiresInSeconds: 300,
    });
  });

  it("rejects and deletes a quarantine object with mismatched metadata", async () => {
    const { initiated, mediaRepository, objectStore } = await initiatedUpload();
    objectStore.inspected = {
      key: initiated.media.quarantineKey,
      sizeBytes: 1024,
      declaredContentType: "image/jpeg",
      mediaId: "different-media",
      checksum: null,
    };

    const completed = await completeWardrobeMediaUpload(
      { mediaId: initiated.media.id, ownerId: initiated.media.ownerId },
      { mediaRepository, objectStore, now: () => now },
    );

    expect(completed.status).toBe("rejected");
    expect(completed.rejectionCode).toBe("metadata-mismatch");
    expect(objectStore.deleted).toContain("quarantine/media-1");
  });

  it("promotes a safely scanned upload and deletes it idempotently", async () => {
    const { initiated, mediaRepository, objectStore } = await initiatedUpload();
    objectStore.inspected = {
      key: initiated.media.quarantineKey,
      sizeBytes: 1024,
      declaredContentType: "image/jpeg",
      mediaId: initiated.media.id,
      checksum: "checksum",
    };

    const uploaded = await completeWardrobeMediaUpload(
      { mediaId: initiated.media.id, ownerId: initiated.media.ownerId },
      { mediaRepository, objectStore, now: () => now },
    );
    expect(uploaded.status).toBe("uploaded");

    const ready = await processWardrobeMedia(
      { mediaId: uploaded.id, ownerId: uploaded.ownerId },
      {
        mediaRepository,
        objectStore,
        scanner: new FixedScanner({
          verdict: "safe",
          detectedContentType: "image/jpeg",
          scanner: "clamav",
          reference: null,
        }),
        now: () => now,
      },
    );

    expect(ready?.status).toBe("ready");
    expect(objectStore.promoted).toEqual({
      quarantineKey: "quarantine/media-1",
      privateKey: "private/media-1",
      detectedContentType: "image/jpeg",
    });

    const deleted = await deleteWardrobeMediaForOwner(
      { mediaId: uploaded.id, ownerId: uploaded.ownerId },
      { mediaRepository, objectStore, now: () => now },
    );
    const repeated = await deleteWardrobeMediaForOwner(
      { mediaId: uploaded.id, ownerId: uploaded.ownerId },
      { mediaRepository, objectStore, now: () => now },
    );

    expect(deleted?.status).toBe("deleted");
    expect(repeated?.status).toBe("deleted");
    expect(objectStore.deleted).toContain("private/media-1");
  });

  it("rejects malicious content without promoting it", async () => {
    const { initiated, mediaRepository, objectStore } = await initiatedUpload();
    objectStore.inspected = {
      key: initiated.media.quarantineKey,
      sizeBytes: 1024,
      declaredContentType: "image/jpeg",
      mediaId: initiated.media.id,
      checksum: null,
    };
    const uploaded = await completeWardrobeMediaUpload(
      { mediaId: initiated.media.id, ownerId: initiated.media.ownerId },
      { mediaRepository, objectStore, now: () => now },
    );

    const rejected = await processWardrobeMedia(
      { mediaId: uploaded.id, ownerId: uploaded.ownerId },
      {
        mediaRepository,
        objectStore,
        scanner: new FixedScanner({
          verdict: "malicious",
          detectedContentType: "image/jpeg",
          scanner: "clamav",
          reference: "test-signature",
        }),
        now: () => now,
      },
    );

    expect(rejected?.status).toBe("rejected");
    expect(rejected?.rejectionCode).toBe("malware-detected");
    expect(objectStore.promoted).toBeNull();
    expect(objectStore.deleted).toContain("quarantine/media-1");
  });
});
