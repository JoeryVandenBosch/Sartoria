import {
  TravelPlanRevisionConflictError,
  type TravelPlanRepository,
} from "@/modules/planning/application/travel-plan-repository";
import type { TravelPlan } from "@/modules/planning/domain/travel-plan";

export class InMemoryTravelPlanRepository implements TravelPlanRepository {
  private readonly plans = new Map<string, TravelPlan>();

  async create(plan: TravelPlan): Promise<void> {
    if (this.plans.has(plan.id)) {
      throw new Error("The travel-plan identifier already exists.");
    }
    this.plans.set(plan.id, plan);
  }

  async update(plan: TravelPlan, expectedRevision: number): Promise<void> {
    const current = this.plans.get(plan.id);
    if (!current || current.ownerId !== plan.ownerId || current.revision !== expectedRevision) {
      throw new TravelPlanRevisionConflictError();
    }
    this.plans.set(plan.id, plan);
  }

  async listByOwner(ownerId: string): Promise<readonly TravelPlan[]> {
    return Object.freeze(
      [...this.plans.values()]
        .filter((plan) => plan.ownerId === ownerId)
        .sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id),
        ),
    );
  }

  async findByIdForOwner(planId: string, ownerId: string): Promise<TravelPlan | null> {
    const plan = this.plans.get(planId);
    return plan?.ownerId === ownerId ? plan : null;
  }

  async deleteByIdForOwner(
    planId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const current = this.plans.get(planId);
    if (!current || current.ownerId !== ownerId) {
      return false;
    }
    if (current.revision !== expectedRevision) {
      throw new TravelPlanRevisionConflictError();
    }
    return this.plans.delete(planId);
  }
}
