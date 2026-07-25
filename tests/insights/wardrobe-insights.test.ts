import { describe, expect, it } from "vitest";

import { calculateWardrobeInsights } from "@/modules/insights/application/calculate-wardrobe-insights";
import { createOutfit } from "@/modules/outfits/domain/outfit";
import { createOutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";
import { createWardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

function item(
  id: string,
  input: Readonly<{
    category: Parameters<typeof createWardrobeItem>[0]["category"];
    name: string;
    brand?: string;
    colour: string;
    status?: Parameters<typeof createWardrobeItem>[0]["ownershipStatus"];
    costMinor?: number;
    currency?: string;
  }>,
) {
  return createWardrobeItem(
    {
      ownerId: "owner-1",
      category: input.category,
      name: input.name,
      brand: input.brand,
      primaryColor: input.colour,
      ownershipStatus: input.status,
      acquisitionCostMinor: input.costMinor,
      acquisitionCurrency: input.currency,
    },
    { createId: () => id, now: () => new Date("2026-07-25T20:00:00.000Z") },
  );
}

const wardrobe = [
  item("blazer-a", {
    category: "tailoring",
    name: "Navy blazer A",
    brand: "Gran Sasso",
    colour: "Navy",
    costMinor: 30_000,
    currency: "EUR",
  }),
  item("blazer-b", {
    category: "tailoring",
    name: "Navy blazer B",
    brand: "Gran Sasso",
    colour: " navy ",
  }),
  item("shirt-a", {
    category: "shirts",
    name: "White shirt",
    brand: "Sartoria",
    colour: "White",
  }),
  item("trousers-a", {
    category: "trousers",
    name: "Navy trousers",
    colour: "Navy",
  }),
  item("shoes-a", {
    category: "footwear",
    name: "White sneakers",
    colour: "White",
  }),
  item("wishlist-blazer", {
    category: "tailoring",
    name: "Considered navy blazer",
    brand: "Gran Sasso",
    colour: "Navy",
    status: "wish-list",
  }),
];

const outfit = createOutfit({
  id: "outfit-1",
  ownerId: "owner-1",
  outfit: {
    name: "Dinner outfit",
    wardrobeItemIds: ["blazer-a", "trousers-a", "shoes-a"],
  },
  now: new Date("2026-07-25T20:00:00.000Z"),
});

const events = [
  createOutfitWearEvent({
    id: "wear-1",
    outfitId: outfit.id,
    ownerId: "owner-1",
    event: { wornOn: "2026-07-20" },
    now: new Date("2026-07-25T20:00:00.000Z"),
  }),
  createOutfitWearEvent({
    id: "wear-2",
    outfitId: outfit.id,
    ownerId: "owner-1",
    event: { wornOn: "2026-07-24" },
    now: new Date("2026-07-25T20:00:00.000Z"),
  }),
];

describe("factual wardrobe insights", () => {
  it("calculates ownership and broad functional coverage", () => {
    const result = calculateWardrobeInsights(wardrobe, [{ outfit, events }]);

    expect(result.ownership).toEqual({ owned: 5, wishList: 1, archived: 0 });
    expect(result.functionalCoverage.every((group) => group.status === "covered")).toBe(true);
    expect(
      result.categories.find((entry) => entry.category === "tailoring")?.ownedCount,
    ).toBe(2);
  });

  it("finds exact factual duplicate signals without repeating the same near cluster", () => {
    const result = calculateWardrobeInsights(wardrobe, [{ outfit, events }]);
    const exact = result.duplicateClusters.find((cluster) => cluster.kind === "exact-signal");

    expect(exact?.itemIds).toEqual(["blazer-a", "blazer-b"]);
    expect(exact?.normalizedColour).toBe("navy");
    expect(exact?.normalizedBrand).toBe("gran sasso");
    expect(
      result.duplicateClusters.filter(
        (cluster) => cluster.kind === "near-signal" && cluster.itemIds.length === 2,
      ),
    ).toHaveLength(0);
  });

  it("attributes explicit outfit wear to current membership and calculates cost per wear", () => {
    const result = calculateWardrobeInsights(wardrobe, [{ outfit, events }]);
    const wornBlazer = result.itemUsage.find((entry) => entry.itemId === "blazer-a");
    const unwornBlazer = result.itemUsage.find((entry) => entry.itemId === "blazer-b");

    expect(wornBlazer).toMatchObject({
      outfitMembershipCount: 1,
      attributedWearCount: 2,
      lastWornOn: "2026-07-24",
      costPerWearMinor: 15_000,
      costCurrency: "EUR",
      underuseStatus: "used",
    });
    expect(unwornBlazer).toMatchObject({
      outfitMembershipCount: 0,
      attributedWearCount: 0,
      costPerWearMinor: null,
      underuseStatus: "not-recorded",
    });
  });

  it("does not label items underused when no wear history exists", () => {
    const result = calculateWardrobeInsights(wardrobe, [{ outfit, events: [] }]);
    expect(result.totalWearEvents).toBe(0);
    expect(result.itemUsage.every((entry) => entry.underuseStatus === "unavailable")).toBe(true);
  });

  it("describes wish-list overlap and broad coverage contribution", () => {
    const result = calculateWardrobeInsights(wardrobe, [{ outfit, events }]);
    const impact = result.wishListImpact.find((entry) => entry.itemId === "wishlist-blazer");

    expect(impact).toMatchObject({
      sameCategoryOwnedCount: 2,
      sameCategoryColourOwnedCount: 2,
      exactSignalOwnedCount: 2,
      contributesToCoverageGap: false,
      duplicationRisk: "high",
    });
    expect(impact?.explanation).toContain("2 owned item(s) share the category");
  });
});
