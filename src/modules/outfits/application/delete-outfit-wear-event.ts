import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";

export async function deleteOwnerOutfitWearEvent(
  input: Readonly<{
    eventId: string;
    ownerId: string;
  }>,
  repository: OutfitWearEventRepository,
): Promise<boolean> {
  return repository.deleteByIdForOwner(input.eventId, input.ownerId);
}
