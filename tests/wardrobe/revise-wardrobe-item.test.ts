import { describe, expect, it } from "vitest";

import { reviseWardrobeItemForOwner } from "@/modules/wardrobe/application/revise-wardrobe-item";
import {
  createWardrobeItem,
  reviseWardrobeItem,
  WardrobeItemValidationError,
  type WardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function owned(): WardrobeItem {
  return createWardrobeItem(
    {
      ownerId: "owner-1",
      category: "tailoring",
      name: "Navy blazer",
      brand: "Lardini",
      primaryColor: "Navy",
      ownershipStatus: "owned",
      acquisitionCostMinor: 48_000,
      acquisitionCurrency: "EUR",
      fitNotes: "Sleeves shortened.",
    },
    { createId: () => "item-1", now: () => NOW },
  );
}

function wishListed(): WardrobeItem {
  return createWardrobeItem(
    {
      ownerId: "owner-1",
      category: "tailoring",
      name: "Grey flannel suit",
      primaryColor: "Grey",
      ownershipStatus: "wish-list",
    },
    { createId: () => "item-2", now: () => NOW },
  );
}

describe("revising an item", () => {
  it("changes only the fields supplied", () => {
    const revised = reviseWardrobeItem(owned(), { name: "Navy wool blazer" });

    expect(revised.name).toBe("Navy wool blazer");
    expect(revised.brand).toBe("Lardini");
    expect(revised.primaryColor).toBe("Navy");
    expect(revised.acquisitionCostMinor).toBe(48_000);
  });

  it("preserves identity, ownership, and the recorded moment", () => {
    const original = owned();
    const revised = reviseWardrobeItem(original, { name: "Something else" });

    expect(revised.id).toBe(original.id);
    expect(revised.ownerId).toBe(original.ownerId);
    expect(revised.createdAt).toBe(original.createdAt);
  });

  it("clears an optional field when given null", () => {
    const revised = reviseWardrobeItem(owned(), { brand: null, fitNotes: null });

    expect(revised.brand).toBeNull();
    expect(revised.fitNotes).toBeNull();
  });

  /** The transition the product previously could not express. */
  it("completes the wish-list to owned transition with an acquisition cost", () => {
    const revised = reviseWardrobeItem(wishListed(), {
      ownershipStatus: "owned",
      acquisitionCostMinor: 129_000,
      acquisitionCurrency: "EUR",
    });

    expect(revised.ownershipStatus).toBe("owned");
    expect(revised.acquisitionCostMinor).toBe(129_000);
    expect(revised.acquisitionCurrency).toBe("EUR");
  });

  it("drops acquisition cost when an item leaves owned", () => {
    // The domain forbids cost on a non-owned item. Dropping it with the status
    // is preferable to refusing a legitimate correction.
    const archived = reviseWardrobeItem(owned(), { ownershipStatus: "archived" });

    expect(archived.ownershipStatus).toBe("archived");
    expect(archived.acquisitionCostMinor ?? null).toBeNull();
    expect(archived.acquisitionCurrency ?? null).toBeNull();
  });

  it("applies the same validation as creation", () => {
    expect(() => reviseWardrobeItem(owned(), { name: "   " })).toThrow(
      WardrobeItemValidationError,
    );
    expect(() => reviseWardrobeItem(owned(), { primaryColor: "" })).toThrow(
      WardrobeItemValidationError,
    );
    expect(() =>
      reviseWardrobeItem(owned(), { acquisitionCostMinor: -1, acquisitionCurrency: "EUR" }),
    ).toThrow(WardrobeItemValidationError);
    expect(() =>
      reviseWardrobeItem(owned(), { acquisitionCostMinor: 1_000, acquisitionCurrency: "euro" }),
    ).toThrow(WardrobeItemValidationError);
  });

  it("cannot be edited into a state it could not have been created in", () => {
    // A wish-list item may not carry a cost, whether created or revised.
    expect(() =>
      createWardrobeItem(
        {
          ownerId: "owner-1",
          category: "tailoring",
          name: "x",
          primaryColor: "Grey",
          ownershipStatus: "wish-list",
          acquisitionCostMinor: 1_000,
          acquisitionCurrency: "EUR",
        },
        { createId: () => "a", now: () => NOW },
      ),
    ).toThrow(WardrobeItemValidationError);

    const revised = reviseWardrobeItem(owned(), {
      ownershipStatus: "wish-list",
      acquisitionCostMinor: 1_000,
      acquisitionCurrency: "EUR",
    });

    expect(revised.acquisitionCostMinor ?? null).toBeNull();
  });
});

describe("owner isolation", () => {
  async function repositoryWith(item: WardrobeItem) {
    const repository = new InMemoryWardrobeItemRepository();
    await repository.save(item);
    return repository;
  }

  it("revises an item the owner holds", async () => {
    const repository = await repositoryWith(owned());

    const revised = await reviseWardrobeItemForOwner(
      { itemId: "item-1", ownerId: "owner-1", revision: { name: "Corrected" } },
      repository,
    );

    expect(revised?.name).toBe("Corrected");
    expect((await repository.findByIdForOwner("item-1", "owner-1"))?.name).toBe("Corrected");
  });

  it("refuses an item belonging to another owner, revealing nothing", async () => {
    const repository = await repositoryWith(owned());

    const result = await reviseWardrobeItemForOwner(
      { itemId: "item-1", ownerId: "owner-2", revision: { name: "Hijacked" } },
      repository,
    );

    // Same answer as a missing identifier: the caller learns nothing.
    expect(result).toBeNull();
    expect((await repository.findByIdForOwner("item-1", "owner-1"))?.name).toBe("Navy blazer");
  });

  it("returns null for an unknown item", async () => {
    const repository = await repositoryWith(owned());

    expect(
      await reviseWardrobeItemForOwner(
        { itemId: "absent", ownerId: "owner-1", revision: { name: "x" } },
        repository,
      ),
    ).toBeNull();
  });
});
