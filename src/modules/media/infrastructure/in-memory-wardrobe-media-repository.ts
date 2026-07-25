import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import type {
  WardrobeMedia,
  WardrobeMediaStatus,
} from "@/modules/media/domain/wardrobe-media";

export class InMemoryWardrobeMediaRepository implements WardrobeMediaRepository {
  private readonly records = new Map<string, WardrobeMedia>();

  async create(media: WardrobeMedia): Promise<void> {
    if (this.records.has(media.id)) {
      throw new Error(`Wardrobe media already exists: ${media.id}`);
    }

    this.records.set(media.id, media);
  }

  async update(media: WardrobeMedia, expectedStatus: WardrobeMediaStatus): Promise<void> {
    const current = this.records.get(media.id);
    if (!current || current.ownerId !== media.ownerId || current.status !== expectedStatus) {
      throw new Error(
        `Wardrobe media ${media.id} was not updated from expected status ${expectedStatus}.`,
      );
    }

    this.records.set(media.id, media);
  }

  async findByIdForOwner(mediaId: string, ownerId: string): Promise<WardrobeMedia | null> {
    const media = this.records.get(mediaId);
    return media && media.ownerId === ownerId ? media : null;
  }

  async listByWardrobeItemForOwner(
    wardrobeItemId: string,
    ownerId: string,
  ): Promise<readonly WardrobeMedia[]> {
    return [...this.records.values()]
      .filter(
        (media) =>
          media.wardrobeItemId === wardrobeItemId &&
          media.ownerId === ownerId &&
          media.status !== "deleted",
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  clear(): void {
    this.records.clear();
  }
}
