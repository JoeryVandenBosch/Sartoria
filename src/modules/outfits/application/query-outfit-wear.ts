import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { OutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";

export type OutfitWearHistory = Readonly<{
  events: readonly OutfitWearEvent[];
  wearCount: number;
  lastWornOn: string | null;
}>;

export async function getOutfitWearHistoryForOwner(
  outfitId: string,
  ownerId: string,
  repository: OutfitWearEventRepository,
): Promise<OutfitWearHistory> {
  const events = await repository.listByOutfitForOwner(outfitId, ownerId);
  return Object.freeze({
    events,
    wearCount: events.length,
    lastWornOn: events[0]?.wornOn ?? null,
  });
}
