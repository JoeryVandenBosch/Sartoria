import { describe, expect, it } from "vitest";

import {
  createTravelPlan,
  travelDurationDays,
  TravelPlanValidationError,
} from "@/modules/planning/domain/travel-plan";

function validPlan() {
  return createTravelPlan({
    id: "plan-1",
    ownerId: "owner-1",
    plan: {
      name: "Copenhagen weekend",
      destination: "Copenhagen",
      startDate: "2026-08-20",
      endDate: "2026-08-22",
      climate: "mild",
      activities: ["everyday", "dinner"],
      laundryAccess: "none",
      notes: "Comfortable walking layers.",
      wardrobeItemIds: ["item-1", "item-2"],
      packingWarnings: [],
    },
    now: new Date("2026-07-25T20:00:00.000Z"),
  });
}

describe("travel plan domain", () => {
  it("creates a date-only owner-scoped plan", () => {
    const plan = validPlan();
    expect(plan.ownerId).toBe("owner-1");
    expect(plan.startDate).toBe("2026-08-20");
    expect(plan.endDate).toBe("2026-08-22");
    expect(travelDurationDays(plan.startDate, plan.endDate)).toBe(3);
  });

  it("rejects invalid ordering and plans longer than sixty days", () => {
    expect(() => travelDurationDays("2026-08-22", "2026-08-20")).toThrow(
      TravelPlanValidationError,
    );
    expect(() => travelDurationDays("2026-01-01", "2026-03-02")).toThrow(
      "cannot exceed 60 days",
    );
  });

  it("rejects duplicate or undersized packing lists", () => {
    expect(() =>
      createTravelPlan({
        id: "plan-1",
        ownerId: "owner-1",
        plan: {
          ...validPlan(),
          wardrobeItemIds: ["same", "same"],
        },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrow("duplicate wardrobe items");
  });

  it("stores broad destination and notes without precise travel fields", () => {
    const plan = validPlan();
    expect(plan.destination).toBe("Copenhagen");
    expect(plan.notes).toBe("Comfortable walking layers.");
    expect(plan).not.toHaveProperty("coordinates");
    expect(plan).not.toHaveProperty("bookingReference");
    expect(plan).not.toHaveProperty("departureTime");
  });
});
