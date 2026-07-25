import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  deleteWardrobeMedia,
  type WardrobeMedia,
} from "@/modules/media/domain/wardrobe-media";

export async function deleteWardrobeMediaForOwner(
  input: Readonly<{ mediaId: string; ownerId: string }>,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    now: () => Date;
  }>,
): Promise<WardrobeMedia | null> {
  const media = await dependencies.mediaRepository.findByIdForOwner(input.mediaId, input.ownerId);
  if (!media) {
    return null;
  }

  if (media.status === "deleted") {
    return media;
  }

  const keys = [media.quarantineKey, media.privateKey].filter(
    (key): key is string => Boolean(key),
  );
  await dependencies.objectStore.deleteObjects(keys);

  const deleted = deleteWardrobeMedia(media, dependencies.now());
  await dependencies.mediaRepository.update(deleted, media.status);
  return deleted;
}
