import { z } from "zod";

import type { OutfitWearEventInput } from "@/modules/outfits/domain/outfit-wear-event";

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

export const outfitWearEventTransportSchema = z.object({
  wornOn: z
    .string()
    .trim()
    .regex(datePattern, "Wear date must use YYYY-MM-DD."),
  note: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().trim().max(500).nullable(),
  ),
});

export function toOutfitWearEventInput(
  value: z.infer<typeof outfitWearEventTransportSchema>,
): OutfitWearEventInput {
  return {
    wornOn: value.wornOn,
    note: value.note,
  };
}
