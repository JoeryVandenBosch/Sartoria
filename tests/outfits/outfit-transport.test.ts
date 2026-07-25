import { describe, expect, it } from "vitest";

import {
  outfitTransportSchema,
  toOutfitInput,
} from "@/modules/outfits/transport/outfit-schema";

const candidate = {
  expectedRevision: "0",
  name: "Navy dinner look",
  occasion: "Dinner",
  stylingNotes: "Keep the shirt open at the collar.",
  wardrobeItemIds: ["blazer-1", "shirt-1", "shoe-1"],
};

describe("outfit transport schema", () => {
  it("coerces revision and maps a valid outfit input", () => {
    const parsed = outfitTransportSchema.parse(candidate);
    expect(parsed.expectedRevision).toBe(0);
    expect(toOutfitInput(parsed)).toEqual({
      name: "Navy dinner look",
      occasion: "Dinner",
      stylingNotes: "Keep the shirt open at the collar.",
      wardrobeItemIds: ["blazer-1", "shirt-1", "shoe-1"],
    });
  });

  it("converts blank optional text to null", () => {
    const parsed = outfitTransportSchema.parse({
      ...candidate,
      occasion: "",
      stylingNotes: "",
    });
    const input = toOutfitInput(parsed);
    expect(input.occasion).toBeNull();
    expect(input.stylingNotes).toBeNull();
  });

  it("rejects duplicate and invalid item counts", () => {
    expect(
      outfitTransportSchema.safeParse({
        ...candidate,
        wardrobeItemIds: ["shirt-1", "shirt-1"],
      }).success,
    ).toBe(false);

    expect(
      outfitTransportSchema.safeParse({
        ...candidate,
        wardrobeItemIds: ["shirt-1"],
      }).success,
    ).toBe(false);

    expect(
      outfitTransportSchema.safeParse({
        ...candidate,
        wardrobeItemIds: Array.from({ length: 13 }, (_, index) => `item-${index}`),
      }).success,
    ).toBe(false);
  });

  it("rejects oversized private text and invalid revisions", () => {
    expect(
      outfitTransportSchema.safeParse({
        ...candidate,
        stylingNotes: "x".repeat(1_001),
      }).success,
    ).toBe(false);

    expect(
      outfitTransportSchema.safeParse({
        ...candidate,
        expectedRevision: "-1",
      }).success,
    ).toBe(false);
  });
});
