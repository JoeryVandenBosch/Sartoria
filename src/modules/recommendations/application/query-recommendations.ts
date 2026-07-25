import type { RecommendationRepository } from "@/modules/recommendations/application/recommendation-repository";
import type { WardrobeRecommendation } from "@/modules/recommendations/domain/wardrobe-recommendation";

export async function listRecommendationsForOwner(
  ownerId: string,
  repository: RecommendationRepository,
): Promise<readonly WardrobeRecommendation[]> {
  return repository.listByOwner(ownerId);
}

export async function getRecommendationForOwner(
  recommendationId: string,
  ownerId: string,
  repository: RecommendationRepository,
): Promise<WardrobeRecommendation | null> {
  return repository.findByIdForOwner(recommendationId, ownerId);
}
