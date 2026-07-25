import {
  OutfitRevisionConflictError,
  type OutfitRepository,
} from "@/modules/outfits/application/outfit-repository";
import type { Outfit } from "@/modules/outfits/domain/outfit";

export class InMemoryOutfitRepository implements OutfitRepository {
  private readonly outfits = new Map<string, Outfit>();

  async create(outfit: Outfit): Promise<void> {
    if (this.outfits.has(outfit.id)) {
      throw new Error("The outfit identifier already exists.");
    }
    this.outfits.set(outfit.id, outfit);
  }

  async update(outfit: Outfit, expectedRevision: number): Promise<void> {
    const current = this.outfits.get(outfit.id);
    if (!current || current.ownerId !== outfit.ownerId) {
      throw new Error("The outfit was not found.");
    }
    if (current.revision !== expectedRevision) {
      throw new OutfitRevisionConflictError();
    }
    this.outfits.set(outfit.id, outfit);
  }

  async listByOwner(ownerId: string): Promise<readonly Outfit[]> {
    return [...this.outfits.values()]
      .filter((outfit) => outfit.ownerId === ownerId)
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id),
      );
  }

  async findByIdForOwner(outfitId: string, ownerId: string): Promise<Outfit | null> {
    const outfit = this.outfits.get(outfitId);
    return outfit?.ownerId === ownerId ? outfit : null;
  }

  async deleteByIdForOwner(
    outfitId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const current = this.outfits.get(outfitId);
    if (!current || current.ownerId !== ownerId) {
      return false;
    }
    if (current.revision !== expectedRevision) {
      throw new OutfitRevisionConflictError();
    }
    return this.outfits.delete(outfitId);
  }

  clear(): void {
    this.outfits.clear();
  }
}
