import {
  RecommendationRevisionConflictError,
  type RecommendationRepository,
} from "@/modules/recommendations/application/recommendation-repository";
import {
  correctWardrobeRecommendation,
  rejectWardrobeRecommendation,
  type WardrobeRecommendation,
} from "@/modules/recommendations/domain/wardrobe-recommendation";

export class RecommendationNotFoundError extends Error {
  constructor() {
    super("The recommendation was not found.");
    this.name = "RecommendationNotFoundError";
  }
}

async function currentRecommendation(
  recommendationId: string,
  ownerId: string,
  expectedRevision: number,
  repository: RecommendationRepository,
): Promise<WardrobeRecommendation> {
  const current = await repository.findByIdForOwner(recommendationId, ownerId);
  if (!current) {
    throw new RecommendationNotFoundError();
  }
  if (current.revision !== expectedRevision) {
    throw new RecommendationRevisionConflictError();
  }
  return current;
}

export async function recordRecommendationCorrection(
  input: Readonly<{
    recommendationId: string;
    ownerId: string;
    expectedRevision: number;
    correction: string;
  }>,
  dependencies: Readonly<{
    repository: RecommendationRepository;
    now: () => Date;
  }>,
): Promise<WardrobeRecommendation> {
  const current = await currentRecommendation(
    input.recommendationId,
    input.ownerId,
    input.expectedRevision,
    dependencies.repository,
  );
  const updated = correctWardrobeRecommendation(current, input.correction, dependencies.now());
  await dependencies.repository.update(updated, input.expectedRevision);
  return updated;
}

export async function rejectRecommendation(
  input: Readonly<{
    recommendationId: string;
    ownerId: string;
    expectedRevision: number;
    reason: string | null;
  }>,
  dependencies: Readonly<{
    repository: RecommendationRepository;
    now: () => Date;
  }>,
): Promise<WardrobeRecommendation> {
  const current = await currentRecommendation(
    input.recommendationId,
    input.ownerId,
    input.expectedRevision,
    dependencies.repository,
  );
  const updated = rejectWardrobeRecommendation(current, input.reason, dependencies.now());
  await dependencies.repository.update(updated, input.expectedRevision);
  return updated;
}

export async function deleteRecommendation(
  input: Readonly<{
    recommendationId: string;
    ownerId: string;
  }>,
  repository: RecommendationRepository,
): Promise<boolean> {
  return repository.deleteByIdForOwner(input.recommendationId, input.ownerId);
}
