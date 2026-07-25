import type { TravelPlanRepository } from "@/modules/planning/application/travel-plan-repository";
import type { TravelPlan } from "@/modules/planning/domain/travel-plan";

export async function listTravelPlansForOwner(
  ownerId: string,
  repository: TravelPlanRepository,
): Promise<readonly TravelPlan[]> {
  return repository.listByOwner(ownerId);
}

export async function getTravelPlanForOwner(
  planId: string,
  ownerId: string,
  repository: TravelPlanRepository,
): Promise<TravelPlan | null> {
  return repository.findByIdForOwner(planId, ownerId);
}
