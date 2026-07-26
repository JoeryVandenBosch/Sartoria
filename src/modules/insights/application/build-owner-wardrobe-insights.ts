import {
  calculateWardrobeInsights,
  type OutfitWearHistory,
} from "@/modules/insights/application/calculate-wardrobe-insights";
import type { WardrobeInsights } from "@/modules/insights/domain/wardrobe-insights";
import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export async function buildOwnerWardrobeInsights(
  ownerId: string,
  dependencies: Readonly<{
    wardrobeRepository: WardrobeItemRepository;
    outfitRepository: OutfitRepository;
    wearEventRepository: OutfitWearEventRepository;
  }>,
): Promise<WardrobeInsights> {
  const [wardrobe, outfits] = await Promise.all([
    dependencies.wardrobeRepository.listByOwner(ownerId),
    dependencies.outfitRepository.listByOwner(ownerId),
  ]);

  const history: OutfitWearHistory[] = await Promise.all(
    outfits.map(async (outfit) =>
      Object.freeze({
        outfit,
        events: await dependencies.wearEventRepository.listByOutfitForOwner(outfit.id, ownerId),
      }),
    ),
  );

  return calculateWardrobeInsights(wardrobe, history);
}
