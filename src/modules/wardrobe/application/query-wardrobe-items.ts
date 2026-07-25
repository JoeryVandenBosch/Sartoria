import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

import type { WardrobeItemRepository } from "./wardrobe-item-repository";

export async function listWardrobeItemsForOwner(
  ownerId: string,
  repository: WardrobeItemRepository,
): Promise<readonly WardrobeItem[]> {
  const normalizedOwnerId = ownerId.trim();
  if (normalizedOwnerId.length === 0) {
    throw new Error("ownerId is required");
  }

  return repository.listByOwner(normalizedOwnerId);
}

export async function getWardrobeItemForOwner(
  itemId: string,
  ownerId: string,
  repository: WardrobeItemRepository,
): Promise<WardrobeItem | null> {
  const normalizedItemId = itemId.trim();
  const normalizedOwnerId = ownerId.trim();

  if (normalizedItemId.length === 0) {
    throw new Error("itemId is required");
  }
  if (normalizedOwnerId.length === 0) {
    throw new Error("ownerId is required");
  }

  return repository.findByIdForOwner(normalizedItemId, normalizedOwnerId);
}
