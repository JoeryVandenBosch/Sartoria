import type { OutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";

export interface OutfitWearEventRepository {
  create(event: OutfitWearEvent): Promise<void>;
  listByOutfitForOwner(
    outfitId: string,
    ownerId: string,
  ): Promise<readonly OutfitWearEvent[]>;
  deleteByIdForOwner(eventId: string, ownerId: string): Promise<boolean>;
  deleteByOutfitForOwner(outfitId: string, ownerId: string): Promise<number>;
}
