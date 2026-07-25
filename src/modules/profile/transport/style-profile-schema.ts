import { z } from "zod";

import {
  climateProfiles,
  fitPreferences,
  profileColours,
  profileMaterials,
  recommendationModes,
  styleDirections,
  type StyleProfileInput,
} from "@/modules/profile/domain/style-profile";

const nullableNumber = (minimum: number, maximum: number, halfSteps = false) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z
      .coerce
      .number()
      .min(minimum)
      .max(maximum)
      .refine((value) => Number.isInteger(halfSteps ? value * 2 : value), {
        message: halfSteps ? "Use half-size increments." : "Use a whole number.",
      })
      .nullable(),
  );

const brand = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[\u0000-\u001F\u007F]/u.test(value), "Invalid control character.");

export const styleProfileTransportSchema = z
  .object({
    expectedRevision: z.coerce.number().int().min(0),
    fitPreference: z.enum(fitPreferences),
    climateProfile: z.enum(climateProfiles),
    recommendationMode: z.enum(recommendationModes),
    styleDirections: z.array(z.enum(styleDirections)).max(8),
    preferredColours: z.array(z.enum(profileColours)),
    avoidedColours: z.array(z.enum(profileColours)),
    preferredBrands: z.array(brand).max(20),
    avoidedBrands: z.array(brand).max(20),
    excludedMaterials: z.array(z.enum(profileMaterials)),
    heightCm: nullableNumber(100, 250),
    chestCm: nullableNumber(50, 200),
    waistCm: nullableNumber(40, 200),
    inseamCm: nullableNumber(40, 130),
    shoeSizeEu: nullableNumber(25, 55, true),
    useMeasurementsForRecommendations: z.boolean(),
  })
  .superRefine((value, context) => {
    const preferredColours = new Set(value.preferredColours);
    for (const colour of value.avoidedColours) {
      if (preferredColours.has(colour)) {
        context.addIssue({
          code: "custom",
          message: `${colour} cannot be both preferred and avoided.`,
          path: ["avoidedColours"],
        });
      }
    }

    const preferredBrands = new Set(
      value.preferredBrands.map((item) => item.trim().toLocaleLowerCase("en")),
    );
    for (const item of value.avoidedBrands) {
      if (preferredBrands.has(item.trim().toLocaleLowerCase("en"))) {
        context.addIssue({
          code: "custom",
          message: `${item} cannot be both preferred and avoided.`,
          path: ["avoidedBrands"],
        });
      }
    }
  });

export function toStyleProfileInput(
  value: z.infer<typeof styleProfileTransportSchema>,
): StyleProfileInput {
  return {
    fitPreference: value.fitPreference,
    climateProfile: value.climateProfile,
    recommendationMode: value.recommendationMode,
    styleDirections: value.styleDirections,
    preferredColours: value.preferredColours,
    avoidedColours: value.avoidedColours,
    preferredBrands: value.preferredBrands,
    avoidedBrands: value.avoidedBrands,
    excludedMaterials: value.excludedMaterials,
    measurements: {
      heightCm: value.heightCm,
      chestCm: value.chestCm,
      waistCm: value.waistCm,
      inseamCm: value.inseamCm,
      shoeSizeEu: value.shoeSizeEu,
    },
    useMeasurementsForRecommendations: value.useMeasurementsForRecommendations,
  };
}
