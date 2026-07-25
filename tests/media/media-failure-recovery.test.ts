import { describe, expect, it } from "vitest";

import { initiateWardrobeMediaUpload } from "@/modules/media/application/initiate-wardrobe-media-upload";
import type {
  MediaObjectStore,
  MediaUploadPolicy,
  QuarantineObjectMetadata,
} from "@/modules/media/application/media-object-store";
import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";
import { InMemoryWardrobeMediaRepository } from "@/modules/media/infrastructure/in-memory-wardrobe-media-repository";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

class FailingPolicyObjectStore implements MediaObjectStore {
  readonly deleted: string[] = [];

  async createQuarantineUploadPolicy(): Promise<MediaUploadPolicy> {
    throw new Error("object storage unavailable");
  }

  async inspectQuarantineObject(): Promise<QuarantineObjectMetadata | null> {
    return null;
  }

  async readPrefix(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async streamObject(): Promise<AsyncIterable<Uint8Array>> {
    return (async function* stream() {
      yield new Uint8Array();
    })();
  }

  async promoteQuarantineObject(): Promise<void> {
    throw new Error("not used");
  }

  async createPrivateReadUrl(input: Readonly<{
    key: string;
    contentType: WardrobeMediaType;
    expiresInSeconds: number;
  }>): Promise<string> {
    throw new Error(`not used: ${input.key}`);
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    this.deleted.push(...keys);
  }
}

describe("media failure recovery", () => {
  it("rejects the initiated record when upload policy creation fails", async () => {
    const wardrobeRepository = new InMemoryWardrobeItemRepository();
    const mediaRepository = new InMemoryWardrobeMediaRepository();
    const objectStore = new FailingPolicyObjectStore();
    const item: WardrobeItem = {
      id: "item-1",
      ownerId: "owner-1",
      category: "tailoring",
      name: "Navy blazer",
      brand: null,
      primaryColor: "Navy",
      ownershipStatus: "owned",
      fitNotes: null,
      createdAt: "2026-07-25T12:00:00.000Z",
    };
    await wardrobeRepository.save(item);

    await expect(
      initiateWardrobeMediaUpload(
        {
          ownerId: item.ownerId,
          wardrobeItemId: item.id,
          originalFilename: "blazer.jpg",
          declaredContentType: "image/jpeg",
        },
        {
          wardrobeRepository,
          mediaRepository,
          objectStore,
          createId: () => "media-1",
          now: () => new Date("2026-07-25T12:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("object storage unavailable");

    const media = await mediaRepository.findByIdForOwner("media-1", "owner-1");
    expect(media?.status).toBe("rejected");
    expect(media?.rejectionCode).toBe("object-missing");
    expect(objectStore.deleted).toEqual(["quarantine/media-1"]);
  });
});
