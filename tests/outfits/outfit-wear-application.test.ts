import { describe, expect, it } from "vitest";

import { deleteOwnerOutfitWearEvent } from "@/modules/outfits/application/delete-outfit-wear-event";
import { deleteOwnerOutfitWithHistory } from "@/modules/outfits/application/delete-outfit-with-history";
import { getOutfitWearHistoryForOwner } from "@/modules/outfits/application/query-outfit-wear";
import {
  OutfitWearAuthorizationError,
  recordOwnerOutfitWear,
} from "@/modules/outfits/application/record-outfit-wear";
import { createOutfit } from "@/modules/outfits/domain/outfit";
import { InMemoryOutfitRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-repository";
import { InMemoryOutfitWearEventRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-wear-event-repository";

async function createFixture() {
  const outfitRepository = new InMemoryOutfitRepository();
  const wearEventRepository = new InMemoryOutfitWearEventRepository();
  await outfitRepository.create(
    createOutfit({
      id: "outfit-1",
      ownerId: "owner-1",
      outfit: {
        name: "Navy dinner look",
        wardrobeItemIds: ["blazer-1", "shirt-1"],
      },
      now: new Date("2026-07-20T18:00:00.000Z"),
    }),
  );
  return { outfitRepository, wearEventRepository };
}

describe("outfit wear application", () => {
  it("records only against an outfit owned by the current owner", async () => {
    const { outfitRepository, wearEventRepository } = await createFixture();

    const event = await recordOwnerOutfitWear(
      {
        outfitId: "outfit-1",
        ownerId: "owner-1",
        event: { wornOn: "2026-07-24", note: "Dinner" },
      },
      {
        outfitRepository,
        wearEventRepository,
        createId: () => "wear-1",
        now: () => new Date("2026-07-25T20:00:00.000Z"),
      },
    );

    expect(event.ownerId).toBe("owner-1");
    expect(
      await wearEventRepository.listByOutfitForOwner("outfit-1", "owner-2"),
    ).toEqual([]);

    await expect(
      recordOwnerOutfitWear(
        {
          outfitId: "outfit-1",
          ownerId: "owner-2",
          event: { wornOn: "2026-07-24" },
        },
        {
          outfitRepository,
          wearEventRepository,
          createId: () => "wear-2",
          now: () => new Date("2026-07-25T20:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(OutfitWearAuthorizationError);
  });

  it("calculates count and last-worn only from explicit events", async () => {
    const { outfitRepository, wearEventRepository } = await createFixture();
    const dates = ["2026-07-20", "2026-07-25", "2026-07-23"];

    for (const [index, wornOn] of dates.entries()) {
      await recordOwnerOutfitWear(
        { outfitId: "outfit-1", ownerId: "owner-1", event: { wornOn } },
        {
          outfitRepository,
          wearEventRepository,
          createId: () => `wear-${index + 1}`,
          now: () => new Date(`2026-07-25T20:00:0${index}.000Z`),
        },
      );
    }

    const history = await getOutfitWearHistoryForOwner(
      "outfit-1",
      "owner-1",
      wearEventRepository,
    );
    expect(history.wearCount).toBe(3);
    expect(history.lastWornOn).toBe("2026-07-25");
    expect(history.events.map((event) => event.wornOn)).toEqual([
      "2026-07-25",
      "2026-07-23",
      "2026-07-20",
    ]);
  });

  it("deletes only owner-scoped wear records and recalculates aggregates", async () => {
    const { outfitRepository, wearEventRepository } = await createFixture();
    await recordOwnerOutfitWear(
      { outfitId: "outfit-1", ownerId: "owner-1", event: { wornOn: "2026-07-25" } },
      {
        outfitRepository,
        wearEventRepository,
        createId: () => "wear-1",
        now: () => new Date("2026-07-25T20:00:00.000Z"),
      },
    );

    expect(
      await deleteOwnerOutfitWearEvent(
        { eventId: "wear-1", ownerId: "owner-2" },
        wearEventRepository,
      ),
    ).toBe(false);
    expect(
      await deleteOwnerOutfitWearEvent(
        { eventId: "wear-1", ownerId: "owner-1" },
        wearEventRepository,
      ),
    ).toBe(true);

    const history = await getOutfitWearHistoryForOwner(
      "outfit-1",
      "owner-1",
      wearEventRepository,
    );
    expect(history).toEqual({ events: [], wearCount: 0, lastWornOn: null });
  });

  it("deletes the outfit and its private wear history together", async () => {
    const { outfitRepository, wearEventRepository } = await createFixture();
    await recordOwnerOutfitWear(
      { outfitId: "outfit-1", ownerId: "owner-1", event: { wornOn: "2026-07-25" } },
      {
        outfitRepository,
        wearEventRepository,
        createId: () => "wear-1",
        now: () => new Date("2026-07-25T20:00:00.000Z"),
      },
    );

    expect(
      await deleteOwnerOutfitWithHistory(
        { outfitId: "outfit-1", ownerId: "owner-1", expectedRevision: 1 },
        { outfitRepository, wearEventRepository },
      ),
    ).toBe(true);
    expect(await outfitRepository.findByIdForOwner("outfit-1", "owner-1")).toBeNull();
    expect(
      await wearEventRepository.listByOutfitForOwner("outfit-1", "owner-1"),
    ).toEqual([]);
  });
});
