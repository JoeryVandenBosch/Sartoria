import { describe, expect, it } from "vitest";

import {
  createWardrobeItem,
  WardrobeItemValidationError,
} from "@/modules/wardrobe/domain/wardrobe-item";

const dependencies = {
  createId: () => "item-1",
  now: () => new Date("2026-07-25T12:00:00.000Z"),
};

describe("wardrobe item", () => {
  it("normalises a valid private wardrobe item", () => {
    const item = createWardrobeItem(
      {
        ownerId: " user-1 ",
        category: "tailoring",
        name: " Navy knitted blazer ",
        brand: " Gran Sasso ",
        primaryColor: " Deep navy ",
        fitNotes: " Fits cleanly through the shoulders. ",
      },
      dependencies,
    );

    expect(item).toEqual({
      id: "item-1",
      ownerId: "user-1",
      category: "tailoring",
      name: "Navy knitted blazer",
      brand: "Gran Sasso",
      primaryColor: "Deep navy",
      ownershipStatus: "owned",
      fitNotes: "Fits cleanly through the shoulders.",
      createdAt: "2026-07-25T12:00:00.000Z",
    });
  });

  it("converts blank optional values to null", () => {
    const item = createWardrobeItem(
      {
        ownerId: "user-1",
        category: "footwear",
        name: "White sneakers",
        brand: "   ",
        primaryColor: "White",
        fitNotes: "",
      },
      dependencies,
    );

    expect(item.brand).toBeNull();
    expect(item.fitNotes).toBeNull();
  });

  it("rejects a missing item name", () => {
    expect(() =>
      createWardrobeItem(
        {
          ownerId: "user-1",
          category: "shirts",
          name: "   ",
          primaryColor: "White",
        },
        dependencies,
      ),
    ).toThrowError(WardrobeItemValidationError);
  });

  it("rejects oversized private fit notes", () => {
    expect(() =>
      createWardrobeItem(
        {
          ownerId: "user-1",
          category: "trousers",
          name: "Techwool trousers",
          primaryColor: "Navy",
          fitNotes: "x".repeat(501),
        },
        dependencies,
      ),
    ).toThrowError("fitNotes must be 500 characters or fewer");
  });
});
