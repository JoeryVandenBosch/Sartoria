import type { Outfit } from "@/modules/outfits/domain/outfit";

export class OutfitRevisionConflictError extends Error {
  constructor() {
    super("The outfit changed in another session.");
    this.name = "OutfitRevisionConflictError";
  }
}

export interface OutfitRepository {
  create(outfit: Outfit): Promise<void>;
  update(outfit: Outfit, expectedRevision: number): Promise<void>;
  listByOwner(ownerId: string): Promise<readonly Outfit[]>;
  findByIdForOwner(outfitId: string, ownerId: string): Promise<Outfit | null>;
  deleteByIdForOwner(
    outfitId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
