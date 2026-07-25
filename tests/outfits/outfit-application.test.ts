import { describe, expect, it } from "vitest";

import { createOwnerOutfit } from "@/modules/outfits/application/create-outfit";
import { deleteOwnerOutfit } from "@/modules/outfits/application/delete-outfit";
import {
  getOutfitForOwner,
  listOutfitsForOwner,
} from "@/modules/outfits/application/query-outfits";
import { OutfitRevisionConflictError } from "@/modules/outfits/application/outfit-repository";
import { updateOwnerOutfit } from "@/modules/outfits/application/update-outfit";
import { OutfitWardrobeSelectionError } from "@/modules/outfits/application/verify-outfit-wardrobe-items";
import { InMemoryOutfitRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-repository";
import { createWardrobeItem, type WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

function wardrobeItem(
  id: string,
  ownerId: string,
  overrides: Partial<Pick<WardrobeItem, "ownershipStatus" | "category" | "name">> = {},
): WardrobeItem {
  return createWardrobeItem(
    {
      ownerId,
      category: overrides.category ?? "shirts",
      name: overrides.name ?? id,
      primaryColor: "Navy",
      ownershipStatus: overrides.ownershipStatus ?? "owned",
    },
    {
      createId: () => id,
      now: () => new Date("2026-07-25T20:00:00.000Z"),
    },
  );
}

function dependencies() {
  const wardrobeRepository = new InMemoryWardrobeItemRepository([
    wardrobeItem("blazer-1", "owner-1", { category: "tailoring" }),
    wardrobeItem("shirt-1", "owner-1"),
    wardrobeItem("shoe-1", "owner-1", { category: "footwear" }),
    wardrobeItem("archived-1", "owner-1", { ownershipStatus: "archived" }),
    wardrobeItem("other-owner-1", "owner-2"),
  ]);
  const outfitRepository = new InMemoryOutfitRepository();

  return { wardrobeRepository, outfitRepository };
}

describe("outfit application", () => {
  it("creates and queries an owner-scoped manual outfit", async () => {
    const { wardrobeRepository, outfitRepository } = dependencies();
    const outfit = await createOwnerOutfit(
      {
        ownerId: "owner-1",
        outfit: {
          name: "Navy dinner look",
          occasion: "Dinner",
          wardrobeItemIds: ["blazer-1", "shirt-1", "shoe-1"],
        },
      },
      {
        wardrobeRepository,
        outfitRepository,
        createId: () => "outfit-1",
        now: () => new Date("2026-07-25T21:00:00.000Z"),
      },
    );

    expect(outfit.ownerId).toBe("owner-1");
    expect(await getOutfitForOwner("outfit-1", "owner-1", outfitRepository)).toEqual(outfit);
    expect(await getOutfitForOwner("outfit-1", "owner-2", outfitRepository)).toBeNull();
    expect(await listOutfitsForOwner("owner-2", outfitRepository)).toEqual([]);
  });

  it("rejects archived, missing, and cross-owner wardrobe references", async () => {
    const { wardrobeRepository, outfitRepository } = dependencies();

    for (const unavailableId of ["archived-1", "missing-1", "other-owner-1"]) {
      await expect(
        createOwnerOutfit(
          {
            ownerId: "owner-1",
            outfit: {
              name: "Invalid look",
              wardrobeItemIds: ["shirt-1", unavailableId],
            },
          },
          {
            wardrobeRepository,
            outfitRepository,
            createId: () => `outfit-${unavailableId}`,
            now: () => new Date("2026-07-25T21:00:00.000Z"),
          },
        ),
      ).rejects.toBeInstanceOf(OutfitWardrobeSelectionError);
    }

    expect(await listOutfitsForOwner("owner-1", outfitRepository)).toEqual([]);
  });

  it("updates composition with optimistic revision protection", async () => {
    const { wardrobeRepository, outfitRepository } = dependencies();
    await createOwnerOutfit(
      {
        ownerId: "owner-1",
        outfit: {
          name: "Navy dinner look",
          wardrobeItemIds: ["blazer-1", "shirt-1"],
        },
      },
      {
        wardrobeRepository,
        outfitRepository,
        createId: () => "outfit-1",
        now: () => new Date("2026-07-25T21:00:00.000Z"),
      },
    );

    const updated = await updateOwnerOutfit(
      {
        outfitId: "outfit-1",
        ownerId: "owner-1",
        expectedRevision: 1,
        outfit: {
          name: "Revised navy dinner look",
          wardrobeItemIds: ["blazer-1", "shirt-1", "shoe-1"],
        },
      },
      {
        wardrobeRepository,
        outfitRepository,
        now: () => new Date("2026-07-25T22:00:00.000Z"),
      },
    );

    expect(updated.revision).toBe(2);
    expect(updated.wardrobeItemIds).toEqual(["blazer-1", "shirt-1", "shoe-1"]);

    await expect(
      updateOwnerOutfit(
        {
          outfitId: "outfit-1",
          ownerId: "owner-1",
          expectedRevision: 1,
          outfit: {
            name: "Stale update",
            wardrobeItemIds: ["shirt-1", "shoe-1"],
          },
        },
        {
          wardrobeRepository,
          outfitRepository,
          now: () => new Date("2026-07-25T23:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(OutfitRevisionConflictError);
  });

  it("deletes only the owner's current revision", async () => {
    const { wardrobeRepository, outfitRepository } = dependencies();
    await createOwnerOutfit(
      {
        ownerId: "owner-1",
        outfit: {
          name: "Navy dinner look",
          wardrobeItemIds: ["blazer-1", "shirt-1"],
        },
      },
      {
        wardrobeRepository,
        outfitRepository,
        createId: () => "outfit-1",
        now: () => new Date("2026-07-25T21:00:00.000Z"),
      },
    );

    expect(
      await deleteOwnerOutfit(
        { outfitId: "outfit-1", ownerId: "owner-2", expectedRevision: 1 },
        outfitRepository,
      ),
    ).toBe(false);

    await expect(
      deleteOwnerOutfit(
        { outfitId: "outfit-1", ownerId: "owner-1", expectedRevision: 0 },
        outfitRepository,
      ),
    ).rejects.toBeInstanceOf(OutfitRevisionConflictError);

    expect(
      await deleteOwnerOutfit(
        { outfitId: "outfit-1", ownerId: "owner-1", expectedRevision: 1 },
        outfitRepository,
      ),
    ).toBe(true);
  });
});
