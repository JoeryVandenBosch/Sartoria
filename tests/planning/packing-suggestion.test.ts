import { describe, expect, it } from "vitest";

import {
  createPackingTargets,
  generatePackingSuggestion,
} from "@/modules/planning/application/generate-packing-suggestion";
import { createWardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

function item(
  id: string,
  category: Parameters<typeof createWardrobeItem>[0]["category"],
  name: string,
) {
  return createWardrobeItem(
    {
      ownerId: "owner-1",
      category,
      name,
      primaryColor: "Navy",
    },
    { createId: () => id, now: () => new Date("2026-07-25T20:00:00.000Z") },
  );
}

const wardrobe = [
  item("shirt-1", "shirts", "White shirt"),
  item("top-1", "tops", "Navy polo"),
  item("trousers-1", "trousers", "Navy trousers"),
  item("denim-1", "denim", "Dark denim"),
  item("shoes-1", "footwear", "White sneakers"),
  item("shoes-2", "footwear", "Brown shoes"),
  item("knit-1", "knitwear", "Navy knit"),
  item("coat-1", "outerwear", "Travel coat"),
  item("blazer-1", "tailoring", "Navy blazer"),
  item("accessory-1", "accessories", "Brown belt"),
];

const input = {
  startDate: "2026-08-20",
  endDate: "2026-08-22",
  climate: "mild" as const,
  activities: ["everyday", "dinner"] as const,
  laundryAccess: "none" as const,
};

describe("deterministic packing suggestion", () => {
  it("creates stable targets from dates, climate, activities, and laundry", () => {
    const targets = createPackingTargets(input);
    expect(targets.find((target) => target.label === "Tailoring")?.target).toBe(1);
    expect(targets.find((target) => target.label === "Knitwear")?.target).toBe(1);
    expect(targets.find((target) => target.label === "Footwear")?.target).toBe(2);
  });

  it("returns the same ordered owned items for the same input", () => {
    const first = generatePackingSuggestion(input, wardrobe, null);
    const second = generatePackingSuggestion(input, [...wardrobe].reverse(), null);

    expect(first.items).toEqual(second.items);
    expect(new Set(first.items.map((entry) => entry.itemId)).size).toBe(first.items.length);
    expect(first.items.every((entry) => wardrobe.some((value) => value.id === entry.itemId))).toBe(true);
  });

  it("records coverage warnings without fabricating items", () => {
    const suggestion = generatePackingSuggestion(
      { ...input, climate: "cold", activities: ["everyday", "active"] },
      wardrobe.filter((value) => value.category !== "activewear" && value.category !== "outerwear"),
      null,
    );

    expect(suggestion.warnings.some((warning) => warning.startsWith("Activewear:"))).toBe(true);
    expect(suggestion.warnings.some((warning) => warning.startsWith("Outerwear:"))).toBe(true);
    expect(suggestion.items.every((entry) => entry.itemId !== "invented-item")).toBe(true);
  });

  it("reduces rotation targets when regular laundry is available", () => {
    const withoutLaundry = createPackingTargets({ ...input, endDate: "2026-08-27" });
    const withLaundry = createPackingTargets({
      ...input,
      endDate: "2026-08-27",
      laundryAccess: "regular",
    });
    const upperWithout = withoutLaundry.find((target) => target.label === "Daily upper layers");
    const upperWith = withLaundry.find((target) => target.label === "Daily upper layers");
    expect(upperWith?.target).toBeLessThan(upperWithout?.target ?? 0);
  });
});
