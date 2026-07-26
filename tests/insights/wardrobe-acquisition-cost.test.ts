import { describe, expect, it } from "vitest";

import {
  createWardrobeItem,
  WardrobeItemValidationError,
} from "@/modules/wardrobe/domain/wardrobe-item";
import { parseNewWardrobeItem } from "@/modules/wardrobe/transport/wardrobe-item-schema";

const dependencies = {
  createId: () => "item-1",
  now: () => new Date("2026-07-25T20:00:00.000Z"),
};

describe("owner-provided acquisition cost", () => {
  it("parses decimal major units into integer minor units", () => {
    const input = parseNewWardrobeItem("owner-1", {
      category: "tailoring",
      name: "Navy blazer",
      brand: "Gran Sasso",
      primaryColor: "Navy",
      ownershipStatus: "owned",
      fitNotes: "",
      acquisitionCost: "349,95",
      acquisitionCurrency: "eur",
    });

    expect(input.acquisitionCostMinor).toBe(34_995);
    expect(input.acquisitionCurrency).toBe("EUR");
    expect(createWardrobeItem(input, dependencies)).toMatchObject({
      acquisitionCostMinor: 34_995,
      acquisitionCurrency: "EUR",
    });
  });

  it("keeps existing cost-free items valid", () => {
    const item = createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "shirts",
        name: "White shirt",
        primaryColor: "White",
      },
      dependencies,
    );
    expect(item.acquisitionCostMinor).toBeNull();
    expect(item.acquisitionCurrency).toBeNull();
  });

  it("requires amount and currency together", () => {
    expect(() =>
      createWardrobeItem(
        {
          ownerId: "owner-1",
          category: "tailoring",
          name: "Navy blazer",
          primaryColor: "Navy",
          acquisitionCostMinor: 30_000,
        },
        dependencies,
      ),
    ).toThrow(WardrobeItemValidationError);
  });

  it("rejects acquisition cost on wish-list items", () => {
    expect(() =>
      createWardrobeItem(
        {
          ownerId: "owner-1",
          category: "tailoring",
          name: "Considered blazer",
          primaryColor: "Navy",
          ownershipStatus: "wish-list",
          acquisitionCostMinor: 30_000,
          acquisitionCurrency: "EUR",
        },
        dependencies,
      ),
    ).toThrow("only be recorded for an owned item");
  });
});
