import type { TravelPlanRepository } from "@/modules/planning/application/travel-plan-repository";

export async function deleteOwnerTravelPlan(
  input: Readonly<{
    planId: string;
    ownerId: string;
    expectedRevision: number;
  }>,
  repository: TravelPlanRepository,
): Promise<boolean> {
  return repository.deleteByIdForOwner(input.planId, input.ownerId, input.expectedRevision);
}
