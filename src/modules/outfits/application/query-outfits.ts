import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { Outfit } from "@/modules/outfits/domain/outfit";

export async function listOutfitsForOwner(
  ownerId: string,
  repository: OutfitRepository,
): Promise<readonly Outfit[]> {
  return repository.listByOwner(ownerId);
}

export async function getOutfitForOwner(
  outfitId: string,
  ownerId: string,
  repository: OutfitRepository,
): Promise<Outfit | null> {
  return repository.findByIdForOwner(outfitId, ownerId);
}
