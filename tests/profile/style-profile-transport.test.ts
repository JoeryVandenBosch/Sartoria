import { describe, expect, it } from "vitest";

import {
  styleProfileTransportSchema,
  toStyleProfileInput,
} from "@/modules/profile/transport/style-profile-schema";

const candidate = {
  expectedRevision: "0",
  fitPreference: "tailored",
  climateProfile: "mixed",
  recommendationMode: "wardrobe-first",
  styleDirections: ["classic", "italian-smart-casual"],
  preferredColours: ["navy", "white"],
  avoidedColours: ["orange"],
  preferredBrands: ["Gran Sasso"],
  avoidedBrands: [],
  excludedMaterials: ["fur"],
  heightCm: "178",
  chestCm: "103",
  waistCm: "99",
  inseamCm: "76",
  shoeSizeEu: "42",
  useMeasurementsForRecommendations: true,
};

describe("style profile transport schema", () => {
  it("coerces form values into the domain input contract", () => {
    const parsed = styleProfileTransportSchema.parse(candidate);
    const input = toStyleProfileInput(parsed);

    expect(parsed.expectedRevision).toBe(0);
    expect(input.measurements).toEqual({
      heightCm: 178,
      chestCm: 103,
      waistCm: 99,
      inseamCm: 76,
      shoeSizeEu: 42,
    });
    expect(input.useMeasurementsForRecommendations).toBe(true);
  });

  it("converts blank optional measurements to null", () => {
    const parsed = styleProfileTransportSchema.parse({
      ...candidate,
      heightCm: "",
      chestCm: "",
      waistCm: "",
      inseamCm: "",
      shoeSizeEu: "",
    });

    expect(toStyleProfileInput(parsed).measurements).toEqual({
      heightCm: null,
      chestCm: null,
      waistCm: null,
      inseamCm: null,
      shoeSizeEu: null,
    });
  });

  it("rejects overlapping signals and malformed measurements", () => {
    const overlap = styleProfileTransportSchema.safeParse({
      ...candidate,
      avoidedColours: ["navy"],
      avoidedBrands: ["gran sasso"],
    });
    expect(overlap.success).toBe(false);

    const invalidShoeSize = styleProfileTransportSchema.safeParse({
      ...candidate,
      shoeSizeEu: "42.25",
    });
    expect(invalidShoeSize.success).toBe(false);
  });

  it("rejects unsupported enum values and too many style directions", () => {
    const unsupported = styleProfileTransportSchema.safeParse({
      ...candidate,
      fitPreference: "oversized",
    });
    expect(unsupported.success).toBe(false);

    const excessiveDirections = styleProfileTransportSchema.safeParse({
      ...candidate,
      styleDirections: [
        "classic",
        "italian-smart-casual",
        "minimal",
        "business",
        "streetwear",
        "workwear",
        "athleisure",
        "romantic",
        "bohemian",
      ],
    });
    expect(excessiveDirections.success).toBe(false);
  });
});
