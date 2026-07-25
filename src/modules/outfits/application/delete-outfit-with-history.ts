import { deleteOwnerOutfit } from "@/modules/outfits/application/delete-outfit";
import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";

export async function deleteOwnerOutfitWithHistory(
  input: Readonly<{
    outfitId: string;
    ownerId: string;
    expectedRevision: number;
  }>,
  dependencies: Readonly<{
    outfitRepository: OutfitRepository;
    wearEventRepository: OutfitWearEventRepository;
  }>,
): Promise<boolean> {
  const deleted = await deleteOwnerOutfit(input, dependencies.outfitRepository);
  if (!deleted) {
    return false;
  }

  await dependencies.wearEventRepository.deleteByOutfitForOwner(
    input.outfitId,
    input.ownerId,
  );
  return true;
}
