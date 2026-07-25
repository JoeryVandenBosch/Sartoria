import { z } from "zod";

import {
  maximumOutfitItems,
  minimumOutfitItems,
  type OutfitInput,
} from "@/modules/outfits/domain/outfit";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().trim().min(1).max(maximum).nullable(),
  );

export const outfitTransportSchema = z
  .object({
    expectedRevision: z.coerce.number().int().min(0),
    name: z.string().trim().min(1).max(120),
    occasion: optionalText(80),
    stylingNotes: optionalText(1_000),
    wardrobeItemIds: z
      .array(z.string().trim().min(1).max(128))
      .min(minimumOutfitItems)
      .max(maximumOutfitItems),
  })
  .superRefine((value, context) => {
    if (new Set(value.wardrobeItemIds).size !== value.wardrobeItemIds.length) {
      context.addIssue({
        code: "custom",
        message: "Select each wardrobe item only once.",
        path: ["wardrobeItemIds"],
      });
    }
  });

export function toOutfitInput(value: z.infer<typeof outfitTransportSchema>): OutfitInput {
  return {
    name: value.name,
    occasion: value.occasion,
    stylingNotes: value.stylingNotes,
    wardrobeItemIds: value.wardrobeItemIds,
  };
}
