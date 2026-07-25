import type {
  WardrobeMedia,
  WardrobeMediaStatus,
} from "@/modules/media/domain/wardrobe-media";

export interface WardrobeMediaRepository {
  create(media: WardrobeMedia): Promise<void>;
  update(media: WardrobeMedia, expectedStatus: WardrobeMediaStatus): Promise<void>;
  findByIdForOwner(mediaId: string, ownerId: string): Promise<WardrobeMedia | null>;
  listByWardrobeItemForOwner(
    wardrobeItemId: string,
    ownerId: string,
  ): Promise<readonly WardrobeMedia[]>;
}
