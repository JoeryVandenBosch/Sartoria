import { describe, expect, it, vi } from "vitest";

import {
  executeCreateWardrobeItem,
  type WardrobeEvent,
} from "@/modules/wardrobe/application/create-wardrobe-item";
import {
  getWardrobeItemForOwner,
  listWardrobeItemsForOwner,
} from "@/modules/wardrobe/application/query-wardrobe-items";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

describe("wardrobe application", () => {
  it("creates, stores, and emits a privacy-safe event", async () => {
    const repository = new InMemoryWardrobeItemRepository();
    const recordEvent = vi.fn<(event: WardrobeEvent) => void>();

    const item = await executeCreateWardrobeItem(
      {
        ownerId: "user-1",
        category: "knitwear",
        name: "Cashmere crew neck",
        brand: "Gran Sasso",
        primaryColor: "Navy",
        fitNotes: "Private fit information",
      },
      {
        repository,
        createId: () => "item-1",
        now: () => new Date("2026-07-25T12:00:00.000Z"),
        recordEvent,
      },
    );

    await expect(repository.findByIdForOwner("item-1", "user-1")).resolves.toEqual(item);
    expect(recordEvent).toHaveBeenCalledWith({
      name: "wardrobe.item.created",
      itemId: "item-1",
      ownerId: "user-1",
      category: "knitwear",
      occurredAt: "2026-07-25T12:00:00.000Z",
    });
    expect(JSON.stringify(recordEvent.mock.calls)).not.toContain("Private fit information");
  });

  it("lists only items belonging to the active owner", async () => {
    const repository = new InMemoryWardrobeItemRepository();

    await executeCreateWardrobeItem(
      {
        ownerId: "user-1",
        category: "shirts",
        name: "White hidden-placket shirt",
        primaryColor: "White",
      },
      {
        repository,
        createId: () => "item-1",
        now: () => new Date("2026-07-25T10:00:00.000Z"),
      },
    );

    await executeCreateWardrobeItem(
      {
        ownerId: "user-2",
        category: "footwear",
        name: "Private shoes",
        primaryColor: "Black",
      },
      {
        repository,
        createId: () => "item-2",
        now: () => new Date("2026-07-25T11:00:00.000Z"),
      },
    );

    const items = await listWardrobeItemsForOwner("user-1", repository);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("item-1");
  });

  it("does not return another owner's item by identifier", async () => {
    const repository = new InMemoryWardrobeItemRepository();

    await executeCreateWardrobeItem(
      {
        ownerId: "user-1",
        category: "accessories",
        name: "Leather belt",
        primaryColor: "Brown",
      },
      {
        repository,
        createId: () => "item-1",
        now: () => new Date("2026-07-25T12:00:00.000Z"),
      },
    );

    await expect(getWardrobeItemForOwner("item-1", "user-2", repository)).resolves.toBeNull();
  });
});
