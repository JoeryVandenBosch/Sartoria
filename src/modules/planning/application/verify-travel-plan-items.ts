import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";
import type { WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

export class TravelPlanWardrobeSelectionError extends Error {
  constructor() {
    super("One or more selected wardrobe items are unavailable.");
    this.name = "TravelPlanWardrobeSelectionError";
  }
}

export async function verifyTravelPlanItems(
  itemIds: readonly string[],
  ownerId: string,
  repository: WardrobeItemRepository,
): Promise<readonly WardrobeItem[]> {
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length !== itemIds.length || uniqueIds.length < 2 || uniqueIds.length > 60) {
    throw new TravelPlanWardrobeSelectionError();
  }

  const items = await Promise.all(
    uniqueIds.map((itemId) => repository.findByIdForOwner(itemId, ownerId)),
  );
  if (items.some((item) => !item || item.ownershipStatus !== "owned")) {
    throw new TravelPlanWardrobeSelectionError();
  }

  return Object.freeze(items as WardrobeItem[]);
}
