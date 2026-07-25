import { describe, expect, it } from "vitest";

import { createOwnerTravelPlan } from "@/modules/planning/application/create-travel-plan";
import { TravelPlanRevisionConflictError } from "@/modules/planning/application/travel-plan-repository";
import { TravelPlanWardrobeSelectionError } from "@/modules/planning/application/verify-travel-plan-items";
import { InMemoryTravelPlanRepository } from "@/modules/planning/infrastructure/in-memory-travel-plan-repository";
import { createWardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

function wardrobe() {
  return new InMemoryWardrobeItemRepository([
    createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "tailoring",
        name: "Navy blazer",
        primaryColor: "Navy",
      },
      { createId: () => "item-1", now: () => new Date("2026-07-25T20:00:00.000Z") },
    ),
    createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "trousers",
        name: "Navy trousers",
        primaryColor: "Navy",
      },
      { createId: () => "item-2", now: () => new Date("2026-07-25T20:00:00.000Z") },
    ),
    createWardrobeItem(
      {
        ownerId: "owner-2",
        category: "footwear",
        name: "Other owner's shoes",
        primaryColor: "White",
      },
      { createId: () => "other-item", now: () => new Date("2026-07-25T20:00:00.000Z") },
    ),
  ]);
}

const planInput = {
  name: "Copenhagen weekend",
  destination: "Copenhagen",
  startDate: "2026-08-20",
  endDate: "2026-08-22",
  climate: "mild" as const,
  activities: ["everyday", "dinner"] as const,
  laundryAccess: "none" as const,
  notes: "Walking and dinner.",
  wardrobeItemIds: ["item-1", "item-2"],
  packingWarnings: [] as const,
};

describe("travel plan application", () => {
  it("creates and queries only the owner's plan", async () => {
    const travelPlanRepository = new InMemoryTravelPlanRepository();
    const plan = await createOwnerTravelPlan(
      { ownerId: "owner-1", plan: planInput },
      {
        travelPlanRepository,
        wardrobeRepository: wardrobe(),
        createId: () => "plan-1",
        now: () => new Date("2026-07-25T21:00:00.000Z"),
      },
    );

    expect(await travelPlanRepository.findByIdForOwner(plan.id, "owner-1")).toEqual(plan);
    expect(await travelPlanRepository.findByIdForOwner(plan.id, "owner-2")).toBeNull();
    expect(await travelPlanRepository.listByOwner("owner-2")).toEqual([]);
  });

  it("rejects cross-owner wardrobe membership", async () => {
    await expect(
      createOwnerTravelPlan(
        {
          ownerId: "owner-1",
          plan: { ...planInput, wardrobeItemIds: ["item-1", "other-item"] },
        },
        {
          travelPlanRepository: new InMemoryTravelPlanRepository(),
          wardrobeRepository: wardrobe(),
          createId: () => "plan-1",
          now: () => new Date("2026-07-25T21:00:00.000Z"),
        },
      ),
    ).rejects.toThrow(TravelPlanWardrobeSelectionError);
  });

  it("protects deletion with an expected revision", async () => {
    const travelPlanRepository = new InMemoryTravelPlanRepository();
    const plan = await createOwnerTravelPlan(
      { ownerId: "owner-1", plan: planInput },
      {
        travelPlanRepository,
        wardrobeRepository: wardrobe(),
        createId: () => "plan-1",
        now: () => new Date("2026-07-25T21:00:00.000Z"),
      },
    );

    await expect(
      travelPlanRepository.deleteByIdForOwner(plan.id, "owner-1", 99),
    ).rejects.toThrow(TravelPlanRevisionConflictError);
    expect(await travelPlanRepository.deleteByIdForOwner(plan.id, "owner-1", 1)).toBe(true);
  });
});
