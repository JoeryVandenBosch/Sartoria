import { describe, expect, it } from "vitest";

import {
  outfitWearEventTransportSchema,
  toOutfitWearEventInput,
} from "@/modules/outfits/transport/outfit-wear-event-schema";

describe("outfit wear-event transport schema", () => {
  it("maps a valid date-only private wear record", () => {
    const parsed = outfitWearEventTransportSchema.parse({
      wornOn: "2026-07-25",
      note: "Dinner look",
    });
    expect(toOutfitWearEventInput(parsed)).toEqual({
      wornOn: "2026-07-25",
      note: "Dinner look",
    });
  });

  it("converts blank notes to null", () => {
    const parsed = outfitWearEventTransportSchema.parse({
      wornOn: "2026-07-25",
      note: "",
    });
    expect(toOutfitWearEventInput(parsed).note).toBeNull();
  });

  it("rejects malformed dates and oversized notes", () => {
    expect(
      outfitWearEventTransportSchema.safeParse({
        wornOn: "25-07-2026",
        note: "",
      }).success,
    ).toBe(false);
    expect(
      outfitWearEventTransportSchema.safeParse({
        wornOn: "2026-07-25",
        note: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});
