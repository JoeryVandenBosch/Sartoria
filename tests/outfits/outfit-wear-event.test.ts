import { describe, expect, it } from "vitest";

import {
  createOutfitWearEvent,
  OutfitWearEventValidationError,
  validateWearDate,
} from "@/modules/outfits/domain/outfit-wear-event";

const now = new Date("2026-07-25T20:30:00.000Z");

describe("outfit wear event", () => {
  it("creates a date-only private wear record", () => {
    const event = createOutfitWearEvent({
      id: "wear-1",
      outfitId: "outfit-1",
      ownerId: "owner-1",
      event: {
        wornOn: "2026-07-24",
        note: " Dinner in Antwerp.\r\nTonal layers worked well. ",
      },
      now,
    });

    expect(event).toEqual({
      id: "wear-1",
      outfitId: "outfit-1",
      ownerId: "owner-1",
      wornOn: "2026-07-24",
      note: "Dinner in Antwerp.\nTonal layers worked well.",
      createdAt: "2026-07-25T20:30:00.000Z",
    });
  });

  it("allows multiple records for the same date through distinct identifiers", () => {
    const first = createOutfitWearEvent({
      id: "wear-1",
      outfitId: "outfit-1",
      ownerId: "owner-1",
      event: { wornOn: "2026-07-25" },
      now,
    });
    const second = createOutfitWearEvent({
      id: "wear-2",
      outfitId: "outfit-1",
      ownerId: "owner-1",
      event: { wornOn: "2026-07-25" },
      now,
    });

    expect(first.wornOn).toBe(second.wornOn);
    expect(first.id).not.toBe(second.id);
  });

  it("rejects invalid, future, and pre-1900 dates", () => {
    expect(() => validateWearDate("2026-02-30", now)).toThrowError(
      "not a valid calendar date",
    );
    expect(() => validateWearDate("2026-07-26", now)).toThrowError(
      "cannot be in the future",
    );
    expect(() => validateWearDate("1899-12-31", now)).toThrowError(
      "cannot be earlier than 1900-01-01",
    );
    expect(() => validateWearDate("25-07-2026", now)).toThrowError(
      OutfitWearEventValidationError,
    );
  });

  it("normalises blank notes and rejects unsafe or oversized notes", () => {
    const blank = createOutfitWearEvent({
      id: "wear-1",
      outfitId: "outfit-1",
      ownerId: "owner-1",
      event: { wornOn: "2026-07-25", note: "   " },
      now,
    });
    expect(blank.note).toBeNull();

    expect(() =>
      createOutfitWearEvent({
        id: "wear-2",
        outfitId: "outfit-1",
        ownerId: "owner-1",
        event: { wornOn: "2026-07-25", note: "x".repeat(501) },
        now,
      }),
    ).toThrowError("500 characters or fewer");

    expect(() =>
      createOutfitWearEvent({
        id: "wear-3",
        outfitId: "outfit-1",
        ownerId: "owner-1",
        event: { wornOn: "2026-07-25", note: "private\u0000note" },
        now,
      }),
    ).toThrowError("invalid control character");
  });
});
