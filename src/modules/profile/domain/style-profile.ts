export const fitPreferences = ["slim", "tailored", "regular", "relaxed"] as const;
export type FitPreference = (typeof fitPreferences)[number];

export const climateProfiles = ["cold", "temperate", "warm", "mixed", "tropical"] as const;
export type ClimateProfile = (typeof climateProfiles)[number];

export const recommendationModes = ["wardrobe-first", "balanced", "shopping-open"] as const;
export type RecommendationMode = (typeof recommendationModes)[number];

export const styleDirections = [
  "classic",
  "italian-smart-casual",
  "minimal",
  "business",
  "streetwear",
  "workwear",
  "athleisure",
  "romantic",
  "bohemian",
  "avant-garde",
] as const;
export type StyleDirection = (typeof styleDirections)[number];

export const profileColours = [
  "black",
  "white",
  "navy",
  "blue",
  "grey",
  "beige",
  "brown",
  "green",
  "red",
  "pink",
  "purple",
  "yellow",
  "orange",
  "metallic",
] as const;
export type ProfileColour = (typeof profileColours)[number];

export const profileMaterials = [
  "wool",
  "cashmere",
  "cotton",
  "linen",
  "leather",
  "suede",
  "silk",
  "synthetic",
  "down",
  "fur",
] as const;
export type ProfileMaterial = (typeof profileMaterials)[number];

export type StyleMeasurements = Readonly<{
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  inseamCm: number | null;
  shoeSizeEu: number | null;
}>;

export type StyleProfilePreferences = Readonly<{
  fitPreference: FitPreference;
  climateProfile: ClimateProfile;
  recommendationMode: RecommendationMode;
  styleDirections: readonly StyleDirection[];
  preferredColours: readonly ProfileColour[];
  avoidedColours: readonly ProfileColour[];
  preferredBrands: readonly string[];
  avoidedBrands: readonly string[];
  excludedMaterials: readonly ProfileMaterial[];
  measurements: StyleMeasurements;
  useMeasurementsForRecommendations: boolean;
}>;

export type StyleProfile = StyleProfilePreferences &
  Readonly<{
    ownerId: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
  }>;

export type StyleProfileInput = StyleProfilePreferences;

const brandControlCharacters = /[\u0000-\u001F\u007F]/u;

function uniqueValues<Value extends string>(values: readonly Value[], maximum: number, field: string): Value[] {
  const unique = [...new Set(values)];
  if (unique.length !== values.length) {
    throw new Error(`${field} cannot contain duplicate values.`);
  }
  if (unique.length > maximum) {
    throw new Error(`${field} cannot contain more than ${maximum} values.`);
  }
  return unique;
}

function normalizeBrands(values: readonly string[], field: string): string[] {
  if (values.length > 20) {
    throw new Error(`${field} cannot contain more than 20 brands.`);
  }

  const normalized: string[] = [];
  const identities = new Set<string>();

  for (const value of values) {
    const brand = value.trim().replace(/\s+/gu, " ");
    if (!brand || brand.length > 80 || brandControlCharacters.test(brand)) {
      throw new Error(`${field} contains an invalid brand value.`);
    }

    const identity = brand.toLocaleLowerCase("en");
    if (!identities.has(identity)) {
      identities.add(identity);
      normalized.push(brand);
    }
  }

  return normalized;
}

function assertNoOverlap<Value extends string>(
  preferred: readonly Value[],
  avoided: readonly Value[],
  field: string,
): void {
  const avoidedValues = new Set(avoided.map((value) => value.toLocaleLowerCase("en")));
  const overlap = preferred.find((value) => avoidedValues.has(value.toLocaleLowerCase("en")));
  if (overlap) {
    throw new Error(`${field} cannot be both preferred and avoided: ${overlap}`);
  }
}

function optionalMeasurement(
  value: number | null,
  minimum: number,
  maximum: number,
  field: string,
  halfSteps = false,
): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${field} must be between ${minimum} and ${maximum}.`);
  }

  const precision = halfSteps ? value * 2 : value;
  if (!Number.isInteger(precision)) {
    throw new Error(`${field} must use ${halfSteps ? "half-size" : "whole-number"} increments.`);
  }

  return value;
}

function normalizePreferences(input: StyleProfileInput): StyleProfilePreferences {
  const directions = uniqueValues(input.styleDirections, 8, "Style directions");
  const preferredColours = uniqueValues(input.preferredColours, profileColours.length, "Preferred colours");
  const avoidedColours = uniqueValues(input.avoidedColours, profileColours.length, "Avoided colours");
  const excludedMaterials = uniqueValues(
    input.excludedMaterials,
    profileMaterials.length,
    "Excluded materials",
  );
  const preferredBrands = normalizeBrands(input.preferredBrands, "Preferred brands");
  const avoidedBrands = normalizeBrands(input.avoidedBrands, "Avoided brands");

  assertNoOverlap(preferredColours, avoidedColours, "A colour");
  assertNoOverlap(preferredBrands, avoidedBrands, "A brand");

  return Object.freeze({
    fitPreference: input.fitPreference,
    climateProfile: input.climateProfile,
    recommendationMode: input.recommendationMode,
    styleDirections: Object.freeze(directions),
    preferredColours: Object.freeze(preferredColours),
    avoidedColours: Object.freeze(avoidedColours),
    preferredBrands: Object.freeze(preferredBrands),
    avoidedBrands: Object.freeze(avoidedBrands),
    excludedMaterials: Object.freeze(excludedMaterials),
    measurements: Object.freeze({
      heightCm: optionalMeasurement(input.measurements.heightCm, 100, 250, "Height"),
      chestCm: optionalMeasurement(input.measurements.chestCm, 50, 200, "Chest"),
      waistCm: optionalMeasurement(input.measurements.waistCm, 40, 200, "Waist"),
      inseamCm: optionalMeasurement(input.measurements.inseamCm, 40, 130, "Inseam"),
      shoeSizeEu: optionalMeasurement(input.measurements.shoeSizeEu, 25, 55, "EU shoe size", true),
    }),
    useMeasurementsForRecommendations: input.useMeasurementsForRecommendations,
  });
}

export function createStyleProfile(
  ownerId: string,
  input: StyleProfileInput,
  now: Date,
): StyleProfile {
  const timestamp = now.toISOString();
  return Object.freeze({
    ownerId,
    revision: 1,
    ...normalizePreferences(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateStyleProfile(
  current: StyleProfile,
  input: StyleProfileInput,
  now: Date,
): StyleProfile {
  return Object.freeze({
    ownerId: current.ownerId,
    revision: current.revision + 1,
    ...normalizePreferences(input),
    createdAt: current.createdAt,
    updatedAt: now.toISOString(),
  });
}

export type RecommendationProfile = Omit<
  StyleProfilePreferences,
  "measurements" | "useMeasurementsForRecommendations"
> &
  Readonly<{
    measurements: StyleMeasurements | null;
  }>;

export function toRecommendationProfile(profile: StyleProfile): RecommendationProfile {
  return Object.freeze({
    fitPreference: profile.fitPreference,
    climateProfile: profile.climateProfile,
    recommendationMode: profile.recommendationMode,
    styleDirections: profile.styleDirections,
    preferredColours: profile.preferredColours,
    avoidedColours: profile.avoidedColours,
    preferredBrands: profile.preferredBrands,
    avoidedBrands: profile.avoidedBrands,
    excludedMaterials: profile.excludedMaterials,
    measurements: profile.useMeasurementsForRecommendations ? profile.measurements : null,
  });
}
