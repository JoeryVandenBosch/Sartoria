import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";
import type { MediaObjectStore, MediaUploadPolicy } from "@/modules/media/application/media-object-store";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  createWardrobeMedia,
  maximumWardrobeMediaBytes,
  mediaPolicyLifetimeSeconds,
  rejectWardrobeMedia,
  type WardrobeMedia,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

export class WardrobeMediaAuthorizationError extends Error {
  constructor() {
    super("The wardrobe item was not found.");
    this.name = "WardrobeMediaAuthorizationError";
  }
}

export type InitiatedWardrobeMediaUpload = Readonly<{
  media: WardrobeMedia;
  policy: MediaUploadPolicy;
}>;

export async function initiateWardrobeMediaUpload(
  input: Readonly<{
    ownerId: string;
    wardrobeItemId: string;
    originalFilename: string;
    declaredContentType: WardrobeMediaType;
  }>,
  dependencies: Readonly<{
    wardrobeRepository: WardrobeItemRepository;
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    createId: () => string;
    now: () => Date;
  }>,
): Promise<InitiatedWardrobeMediaUpload> {
  const wardrobeItem = await dependencies.wardrobeRepository.findByIdForOwner(
    input.wardrobeItemId,
    input.ownerId,
  );

  if (!wardrobeItem) {
    throw new WardrobeMediaAuthorizationError();
  }

  const now = dependencies.now();
  const media = createWardrobeMedia({
    id: dependencies.createId(),
    ownerId: input.ownerId,
    wardrobeItemId: input.wardrobeItemId,
    originalFilename: input.originalFilename,
    declaredContentType: input.declaredContentType,
    now,
  });

  await dependencies.mediaRepository.create(media);

  try {
    const policy = await dependencies.objectStore.createQuarantineUploadPolicy({
      mediaId: media.id,
      key: media.quarantineKey,
      declaredContentType: media.declaredContentType,
      maximumBytes: maximumWardrobeMediaBytes,
      expiresInSeconds: mediaPolicyLifetimeSeconds,
    });

    return { media, policy };
  } catch (error) {
    try {
      await dependencies.objectStore.deleteObjects([media.quarantineKey]);
    } catch {
      // Preserve the policy-generation failure; reconciliation handles any unexpected orphan.
    }

    try {
      const rejected = rejectWardrobeMedia(media, {
        code: "object-missing",
        now: dependencies.now(),
      });
      await dependencies.mediaRepository.update(rejected, "initiated");
    } catch {
      // Preserve the original error; the initiated record remains visible to cleanup reconciliation.
    }

    throw error;
  }
}
