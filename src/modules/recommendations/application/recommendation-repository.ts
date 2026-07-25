import type { WardrobeRecommendation } from "@/modules/recommendations/domain/wardrobe-recommendation";

export class RecommendationRevisionConflictError extends Error {
  constructor() {
    super("The recommendation changed in another session. Reload before trying again.");
    this.name = "RecommendationRevisionConflictError";
  }
}

export interface RecommendationRepository {
  create(recommendation: WardrobeRecommendation): Promise<void>;
  listByOwner(ownerId: string): Promise<readonly WardrobeRecommendation[]>;
  findByIdForOwner(recommendationId: string, ownerId: string): Promise<WardrobeRecommendation | null>;
  update(recommendation: WardrobeRecommendation, expectedRevision: number): Promise<void>;
  deleteByIdForOwner(recommendationId: string, ownerId: string): Promise<boolean>;
}
