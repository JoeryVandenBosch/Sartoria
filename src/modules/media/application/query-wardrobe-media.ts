import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  mediaPolicyLifetimeSeconds,
  type WardrobeMedia,
} from "@/modules/media/domain/wardrobe-media";

export type WardrobeMediaView = Readonly<{
  media: WardrobeMedia;
  readUrl: string | null;
  readUrlExpiresAt: string | null;
}>;

export async function listWardrobeMediaForOwner(
  wardrobeItemId: string,
  ownerId: string,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    now: () => Date;
  }>,
): Promise<readonly WardrobeMediaView[]> {
  const media = await dependencies.mediaRepository.listByWardrobeItemForOwner(
    wardrobeItemId,
    ownerId,
  );

  return Promise.all(
    media.map(async (record): Promise<WardrobeMediaView> => {
      if (record.status !== "ready" || !record.privateKey || !record.detectedContentType) {
        return { media: record, readUrl: null, readUrlExpiresAt: null };
      }

      const readUrl = await dependencies.objectStore.createPrivateReadUrl({
        key: record.privateKey,
        contentType: record.detectedContentType,
        expiresInSeconds: mediaPolicyLifetimeSeconds,
      });
      const readUrlExpiresAt = new Date(
        dependencies.now().getTime() + mediaPolicyLifetimeSeconds * 1_000,
      ).toISOString();

      return { media: record, readUrl, readUrlExpiresAt };
    }),
  );
}
