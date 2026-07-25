import {
  OutfitRevisionConflictError,
  type OutfitRepository,
} from "@/modules/outfits/application/outfit-repository";
import { verifyOutfitWardrobeItems } from "@/modules/outfits/application/verify-outfit-wardrobe-items";
import { updateOutfit, type Outfit, type OutfitInput } from "@/modules/outfits/domain/outfit";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export async function updateOwnerOutfit(
  input: Readonly<{
    outfitId: string;
    ownerId: string;
    expectedRevision: number;
    outfit: OutfitInput;
  }>,
  dependencies: Readonly<{
    outfitRepository: OutfitRepository;
    wardrobeRepository: WardrobeItemRepository;
    now: () => Date;
  }>,
): Promise<Outfit> {
  const current = await dependencies.outfitRepository.findByIdForOwner(
    input.outfitId,
    input.ownerId,
  );

  if (!current) {
    throw new Error("The outfit was not found.");
  }
  if (current.revision !== input.expectedRevision) {
    throw new OutfitRevisionConflictError();
  }

  await verifyOutfitWardrobeItems(
    input.ownerId,
    input.outfit.wardrobeItemIds,
    dependencies.wardrobeRepository,
  );

  const outfit = updateOutfit(current, input.outfit, dependencies.now());
  await dependencies.outfitRepository.update(outfit, input.expectedRevision);
  return outfit;
}
