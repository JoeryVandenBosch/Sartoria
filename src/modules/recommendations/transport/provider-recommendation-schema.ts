import { z } from "zod";

import type { ValidatedProviderRecommendation } from "@/modules/recommendations/application/recommendation-gateway";

export const providerRecommendationSchema = z
  .object({
    schemaVersion: z.literal("1"),
    itemReasons: z
      .array(
        z
          .object({
            itemId: z.string().trim().min(1).max(128),
            reason: z.string().trim().min(1).max(280),
          })
          .strict(),
      )
      .min(2)
      .max(12),
    summary: z.string().trim().min(1).max(600),
    exclusions: z.array(z.string().trim().min(1).max(160)).max(8),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict()
  .superRefine((value, context) => {
    const itemIds = value.itemReasons.map((item) => item.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      context.addIssue({
        code: "custom",
        path: ["itemReasons"],
        message: "Recommended wardrobe item identifiers must be unique.",
      });
    }

    const exclusions = value.exclusions.map((item) => item.toLocaleLowerCase("en"));
    if (new Set(exclusions).size !== exclusions.length) {
      context.addIssue({
        code: "custom",
        path: ["exclusions"],
        message: "Recommendation exclusions must be unique.",
      });
    }
  });

export function parseProviderRecommendation(output: unknown): ValidatedProviderRecommendation {
  const parsed = providerRecommendationSchema.parse(output);
  return Object.freeze({
    itemReasons: Object.freeze(
      parsed.itemReasons.map((item) => Object.freeze({ itemId: item.itemId, reason: item.reason })),
    ),
    summary: parsed.summary,
    exclusions: Object.freeze([...parsed.exclusions]),
    confidence: parsed.confidence,
  });
}
