import type { TravelPlan } from "@/modules/planning/domain/travel-plan";

export class TravelPlanRevisionConflictError extends Error {
  constructor() {
    super("The travel plan changed in another session. Reload before trying again.");
    this.name = "TravelPlanRevisionConflictError";
  }
}

export interface TravelPlanRepository {
  create(plan: TravelPlan): Promise<void>;
  update(plan: TravelPlan, expectedRevision: number): Promise<void>;
  listByOwner(ownerId: string): Promise<readonly TravelPlan[]>;
  findByIdForOwner(planId: string, ownerId: string): Promise<TravelPlan | null>;
  deleteByIdForOwner(planId: string, ownerId: string, expectedRevision: number): Promise<boolean>;
}
