import {
  OutfitRevisionConflictError,
  type OutfitRepository,
} from "@/modules/outfits/application/outfit-repository";

export async function deleteOwnerOutfit(
  input: Readonly<{
    outfitId: string;
    ownerId: string;
    expectedRevision: number;
  }>,
  repository: OutfitRepository,
): Promise<boolean> {
  const current = await repository.findByIdForOwner(input.outfitId, input.ownerId);
  if (!current) {
    return false;
  }
  if (current.revision !== input.expectedRevision) {
    throw new OutfitRevisionConflictError();
  }

  return repository.deleteByIdForOwner(
    input.outfitId,
    input.ownerId,
    input.expectedRevision,
  );
}
