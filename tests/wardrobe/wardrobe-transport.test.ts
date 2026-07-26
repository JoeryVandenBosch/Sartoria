import { describe, expect, it } from "vitest";

import {
  parseNewWardrobeItem,
  wardrobeItemFormSchema,
} from "@/modules/wardrobe/transport/wardrobe-item-schema";

describe("wardrobe item transport validation", () => {
  it("maps validated form input to an owned item", () => {
    const input = parseNewWardrobeItem("user-1", {
      category: "tailoring",
      name: " Navy blazer ",
      brand: " Gran Sasso ",
      primaryColor: " Navy ",
      fitNotes: " Clean shoulder line ",
    });

    expect(input).toEqual({
      ownerId: "user-1",
      category: "tailoring",
      name: "Navy blazer",
      brand: "Gran Sasso",
      primaryColor: "Navy",
      ownershipStatus: "owned",
      fitNotes: "Clean shoulder line",
      acquisitionCostMinor: null,
      acquisitionCurrency: null,
    });
  });

  it("returns field errors for invalid required input", () => {
    const result = wardrobeItemFormSchema.safeParse({
      category: "invalid-category",
      name: "",
      primaryColor: "",
      ownershipStatus: "owned",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.category).toBeDefined();
      expect(errors.name).toContain("Name is required");
      expect(errors.primaryColor).toContain("Primary colour is required");
    }
  });
});
