import { z } from "zod";

import {
  travelActivityContexts,
  travelClimateExpectations,
  travelLaundryAccessLevels,
} from "@/modules/planning/domain/travel-plan";

const optionalText = (maximum: number) =>
  z
    .string()
    .max(maximum)
    .transform((value) => value.trim().replace(/\r\n?/gu, "\n") || null);

export const travelPlanPreviewSchema = z
  .object({
    startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u),
    endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u),
    climate: z.enum(travelClimateExpectations),
    activities: z.array(z.enum(travelActivityContexts)).min(1).max(6),
    laundryAccess: z.enum(travelLaundryAccessLevels),
  })
  .strict();

export const travelPlanCreateSchema = travelPlanPreviewSchema
  .extend({
    name: z.string().trim().min(1).max(120),
    destination: optionalText(120),
    notes: optionalText(1_000),
    wardrobeItemIds: z.array(z.string().trim().min(1).max(128)).min(2).max(60),
    packingWarnings: z.array(z.string().trim().min(1).max(240)).max(12),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.activities).size !== value.activities.length) {
      context.addIssue({ code: "custom", path: ["activities"], message: "Activities must be unique." });
    }
    if (new Set(value.wardrobeItemIds).size !== value.wardrobeItemIds.length) {
      context.addIssue({
        code: "custom",
        path: ["wardrobeItemIds"],
        message: "Packing-list items must be unique.",
      });
    }
  });
