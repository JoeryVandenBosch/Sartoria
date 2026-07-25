import { describe, expect, it } from "vitest";

import {
  createOutfit,
  OutfitValidationError,
  updateOutfit,
  type OutfitInput,
} from "@/modules/outfits/domain/outfit";

const input: OutfitInput = {
  name: " Navy dinner look ",
  occasion: " Dinner ",
  stylingNotes: "Knitted blazer\r\nWhite shirt and clean sneakers.",
  wardrobeItemIds: [" blazer-1 ", "shirt-1", "shoe-1"],
};

describe("outfit", () => {
  it("normalises a valid manual composition", () => {
    const outfit = createOutfit({
      id: "outfit-1",
      ownerId: "owner-1",
      outfit: input,
      now: new Date("2026-07-25T20:00:00.000Z"),
    });

    expect(outfit).toEqual({
      id: "outfit-1",
      ownerId: "owner-1",
      name: "Navy dinner look",
      occasion: "Dinner",
      stylingNotes: "Knitted blazer\nWhite shirt and clean sneakers.",
      wardrobeItemIds: ["blazer-1", "shirt-1", "shoe-1"],
      revision: 1,
      createdAt: "2026-07-25T20:00:00.000Z",
      updatedAt: "2026-07-25T20:00:00.000Z",
    });
  });

  it("increments revision while preserving identity and creation time", () => {
    const created = createOutfit({
      id: "outfit-1",
      ownerId: "owner-1",
      outfit: input,
      now: new Date("2026-07-25T20:00:00.000Z"),
    });
    const updated = updateOutfit(
      created,
      { ...input, name: "Revised navy dinner look" },
      new Date("2026-07-25T21:00:00.000Z"),
    );

    expect(updated.id).toBe(created.id);
    expect(updated.ownerId).toBe(created.ownerId);
    expect(updated.revision).toBe(2);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe("2026-07-25T21:00:00.000Z");
  });

  it("converts blank optional fields to null", () => {
    const outfit = createOutfit({
      id: "outfit-1",
      ownerId: "owner-1",
      outfit: {
        name: "Weekend look",
        occasion: "   ",
        stylingNotes: "",
        wardrobeItemIds: ["top-1", "trouser-1"],
      },
      now: new Date("2026-07-25T20:00:00.000Z"),
    });

    expect(outfit.occasion).toBeNull();
    expect(outfit.stylingNotes).toBeNull();
  });

  it("rejects duplicate, too small, and oversized compositions", () => {
    expect(() =>
      createOutfit({
        id: "outfit-1",
        ownerId: "owner-1",
        outfit: { ...input, wardrobeItemIds: ["shirt-1", "shirt-1"] },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrowError("same wardrobe item more than once");

    expect(() =>
      createOutfit({
        id: "outfit-1",
        ownerId: "owner-1",
        outfit: { ...input, wardrobeItemIds: ["shirt-1"] },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrowError(OutfitValidationError);

    expect(() =>
      createOutfit({
        id: "outfit-1",
        ownerId: "owner-1",
        outfit: {
          ...input,
          wardrobeItemIds: Array.from({ length: 13 }, (_, index) => `item-${index}`),
        },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrowError("between 2 and 12 wardrobe items");
  });

  it("rejects oversized or unsafe private text", () => {
    expect(() =>
      createOutfit({
        id: "outfit-1",
        ownerId: "owner-1",
        outfit: { ...input, stylingNotes: "x".repeat(1_001) },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrowError("Private styling notes must be 1000 characters or fewer");

    expect(() =>
      createOutfit({
        id: "outfit-1",
        ownerId: "owner-1",
        outfit: { ...input, stylingNotes: "private\u0000note" },
        now: new Date("2026-07-25T20:00:00.000Z"),
      }),
    ).toThrowError("invalid control character");
  });
});
