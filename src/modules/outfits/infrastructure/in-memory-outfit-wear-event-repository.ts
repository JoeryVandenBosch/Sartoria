import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { OutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";

export class InMemoryOutfitWearEventRepository implements OutfitWearEventRepository {
  private readonly events = new Map<string, OutfitWearEvent>();

  async create(event: OutfitWearEvent): Promise<void> {
    if (this.events.has(event.id)) {
      throw new Error("The wear-event identifier already exists.");
    }
    this.events.set(event.id, event);
  }

  async listByOutfitForOwner(
    outfitId: string,
    ownerId: string,
  ): Promise<readonly OutfitWearEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.outfitId === outfitId && event.ownerId === ownerId)
      .sort(
        (left, right) =>
          right.wornOn.localeCompare(left.wornOn) ||
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id),
      );
  }

  async deleteByIdForOwner(eventId: string, ownerId: string): Promise<boolean> {
    const event = this.events.get(eventId);
    if (!event || event.ownerId !== ownerId) {
      return false;
    }
    return this.events.delete(eventId);
  }

  async deleteByOutfitForOwner(outfitId: string, ownerId: string): Promise<number> {
    let deleted = 0;
    for (const [eventId, event] of this.events.entries()) {
      if (event.outfitId === outfitId && event.ownerId === ownerId) {
        this.events.delete(eventId);
        deleted += 1;
      }
    }
    return deleted;
  }

  clear(): void {
    this.events.clear();
  }
}
