import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import { verifyOutfitWardrobeItems } from "@/modules/outfits/application/verify-outfit-wardrobe-items";
import { createOutfit, type Outfit, type OutfitInput } from "@/modules/outfits/domain/outfit";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export async function createOwnerOutfit(
  input: Readonly<{
    ownerId: string;
    outfit: OutfitInput;
  }>,
  dependencies: Readonly<{
    outfitRepository: OutfitRepository;
    wardrobeRepository: WardrobeItemRepository;
    createId: () => string;
    now: () => Date;
  }>,
): Promise<Outfit> {
  await verifyOutfitWardrobeItems(
    input.ownerId,
    input.outfit.wardrobeItemIds,
    dependencies.wardrobeRepository,
  );

  const outfit = createOutfit({
    id: dependencies.createId(),
    ownerId: input.ownerId,
    outfit: input.outfit,
    now: dependencies.now(),
  });

  await dependencies.outfitRepository.create(outfit);
  return outfit;
}
