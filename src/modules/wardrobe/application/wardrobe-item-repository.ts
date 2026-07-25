import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

export interface WardrobeItemRepository {
  save(item: WardrobeItem): Promise<void>;
  listByOwner(ownerId: string): Promise<readonly WardrobeItem[]>;
  findByIdForOwner(itemId: string, ownerId: string): Promise<WardrobeItem | null>;
}
