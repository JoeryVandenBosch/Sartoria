import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

export class InMemoryWardrobeItemRepository implements WardrobeItemRepository {
  readonly #items = new Map<string, WardrobeItem>();

  constructor(seed: readonly WardrobeItem[] = []) {
    for (const item of seed) {
      this.#items.set(item.id, item);
    }
  }

  async save(item: WardrobeItem): Promise<void> {
    this.#items.set(item.id, item);
  }

  async listByOwner(ownerId: string): Promise<readonly WardrobeItem[]> {
    return [...this.#items.values()]
      .filter((item) => item.ownerId === ownerId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findByIdForOwner(itemId: string, ownerId: string): Promise<WardrobeItem | null> {
    const item = this.#items.get(itemId);
    return item?.ownerId === ownerId ? item : null;
  }
}
