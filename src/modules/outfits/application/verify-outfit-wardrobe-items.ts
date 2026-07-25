import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

export class OutfitWardrobeSelectionError extends Error {
  constructor(message = "One or more selected wardrobe items are unavailable.") {
    super(message);
    this.name = "OutfitWardrobeSelectionError";
  }
}

export async function verifyOutfitWardrobeItems(
  ownerId: string,
  wardrobeItemIds: readonly string[],
  wardrobeRepository: WardrobeItemRepository,
): Promise<readonly WardrobeItem[]> {
  const items = await Promise.all(
    wardrobeItemIds.map((itemId) => wardrobeRepository.findByIdForOwner(itemId, ownerId)),
  );

  if (items.some((item) => !item || item.ownershipStatus === "archived")) {
    throw new OutfitWardrobeSelectionError();
  }

  return items as readonly WardrobeItem[];
}
