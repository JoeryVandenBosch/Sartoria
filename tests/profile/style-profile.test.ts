import { describe, expect, it } from "vitest";

import {
  createStyleProfile,
  toRecommendationProfile,
  updateStyleProfile,
  type StyleProfileInput,
} from "@/modules/profile/domain/style-profile";

const preferences: StyleProfileInput = {
  fitPreference: "tailored",
  climateProfile: "mixed",
  recommendationMode: "wardrobe-first",
  styleDirections: ["classic", "italian-smart-casual"],
  preferredColours: ["navy", "white", "beige"],
  avoidedColours: ["orange"],
  preferredBrands: [" Gran Sasso ", "Luca   Faloni"],
  avoidedBrands: ["Example Fast Fashion"],
  excludedMaterials: ["fur"],
  measurements: {
    heightCm: 178,
    chestCm: 103,
    waistCm: 99,
    inseamCm: 76,
    shoeSizeEu: 42,
  },
  useMeasurementsForRecommendations: false,
};

describe("style profile", () => {
  it("normalises private preferences and starts revision history", () => {
    const profile = createStyleProfile(
      "owner-1",
      preferences,
      new Date("2026-07-25T18:00:00.000Z"),
    );

    expect(profile.revision).toBe(1);
    expect(profile.preferredBrands).toEqual(["Gran Sasso", "Luca Faloni"]);
    expect(profile.createdAt).toBe("2026-07-25T18:00:00.000Z");
    expect(profile.updatedAt).toBe(profile.createdAt);
  });

  it("increments the revision while preserving ownership and creation time", () => {
    const original = createStyleProfile(
      "owner-1",
      preferences,
      new Date("2026-07-25T18:00:00.000Z"),
    );
    const updated = updateStyleProfile(
      original,
      { ...preferences, fitPreference: "regular" },
      new Date("2026-07-25T19:00:00.000Z"),
    );

    expect(updated.ownerId).toBe("owner-1");
    expect(updated.revision).toBe(2);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBe("2026-07-25T19:00:00.000Z");
    expect(updated.fitPreference).toBe("regular");
  });

  it("keeps optional measurements out of recommendation data until consent is enabled", () => {
    const privateProfile = createStyleProfile(
      "owner-1",
      preferences,
      new Date("2026-07-25T18:00:00.000Z"),
    );
    expect(toRecommendationProfile(privateProfile).measurements).toBeNull();

    const enabledProfile = createStyleProfile(
      "owner-1",
      { ...preferences, useMeasurementsForRecommendations: true },
      new Date("2026-07-25T18:00:00.000Z"),
    );
    expect(toRecommendationProfile(enabledProfile).measurements).toEqual(preferences.measurements);
  });

  it("rejects overlapping preferred and avoided signals", () => {
    expect(() =>
      createStyleProfile(
        "owner-1",
        { ...preferences, avoidedColours: ["navy"] },
        new Date("2026-07-25T18:00:00.000Z"),
      ),
    ).toThrowError("A colour cannot be both preferred and avoided: navy");

    expect(() =>
      createStyleProfile(
        "owner-1",
        { ...preferences, avoidedBrands: ["gran sasso"] },
        new Date("2026-07-25T18:00:00.000Z"),
      ),
    ).toThrowError("A brand cannot be both preferred and avoided: Gran Sasso");
  });

  it("rejects invalid measurements and excessive style directions", () => {
    expect(() =>
      createStyleProfile(
        "owner-1",
        {
          ...preferences,
          measurements: { ...preferences.measurements, shoeSizeEu: 42.25 },
        },
        new Date("2026-07-25T18:00:00.000Z"),
      ),
    ).toThrowError("EU shoe size must use half-size increments");

    expect(() =>
      createStyleProfile(
        "owner-1",
        {
          ...preferences,
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
        },
        new Date("2026-07-25T18:00:00.000Z"),
      ),
    ).toThrowError("Style directions cannot contain more than 8 values");
  });
});
