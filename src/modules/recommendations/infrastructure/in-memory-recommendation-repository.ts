import {
  RecommendationRevisionConflictError,
  type RecommendationRepository,
} from "@/modules/recommendations/application/recommendation-repository";
import type { WardrobeRecommendation } from "@/modules/recommendations/domain/wardrobe-recommendation";

export class InMemoryRecommendationRepository implements RecommendationRepository {
  private readonly recommendations = new Map<string, WardrobeRecommendation>();

  async create(recommendation: WardrobeRecommendation): Promise<void> {
    if (this.recommendations.has(recommendation.id)) {
      throw new Error("The recommendation identifier already exists.");
    }
    this.recommendations.set(recommendation.id, recommendation);
  }

  async listByOwner(ownerId: string): Promise<readonly WardrobeRecommendation[]> {
    return Object.freeze(
      [...this.recommendations.values()]
        .filter((recommendation) => recommendation.ownerId === ownerId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }

  async findByIdForOwner(
    recommendationId: string,
    ownerId: string,
  ): Promise<WardrobeRecommendation | null> {
    const recommendation = this.recommendations.get(recommendationId);
    return recommendation?.ownerId === ownerId ? recommendation : null;
  }

  async update(recommendation: WardrobeRecommendation, expectedRevision: number): Promise<void> {
    const current = this.recommendations.get(recommendation.id);
    if (
      !current ||
      current.ownerId !== recommendation.ownerId ||
      current.revision !== expectedRevision
    ) {
      throw new RecommendationRevisionConflictError();
    }
    this.recommendations.set(recommendation.id, recommendation);
  }

  async deleteByIdForOwner(recommendationId: string, ownerId: string): Promise<boolean> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation || recommendation.ownerId !== ownerId) {
      return false;
    }
    return this.recommendations.delete(recommendationId);
  }
}
