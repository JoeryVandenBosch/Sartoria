import { createTravelPlan, type TravelPlan, type TravelPlanInput } from "@/modules/planning/domain/travel-plan";
import type { TravelPlanRepository } from "@/modules/planning/application/travel-plan-repository";
import { verifyTravelPlanItems } from "@/modules/planning/application/verify-travel-plan-items";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export async function createOwnerTravelPlan(
  input: Readonly<{
    ownerId: string;
    plan: TravelPlanInput;
  }>,
  dependencies: Readonly<{
    travelPlanRepository: TravelPlanRepository;
    wardrobeRepository: WardrobeItemRepository;
    createId: () => string;
    now: () => Date;
  }>,
): Promise<TravelPlan> {
  await verifyTravelPlanItems(
    input.plan.wardrobeItemIds,
    input.ownerId,
    dependencies.wardrobeRepository,
  );

  const plan = createTravelPlan({
    id: dependencies.createId(),
    ownerId: input.ownerId,
    plan: input.plan,
    now: dependencies.now(),
  });
  await dependencies.travelPlanRepository.create(plan);
  return plan;
}
