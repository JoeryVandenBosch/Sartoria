import type { DatabasePool } from "@/lib/database/database-session";
import { withOwnerDatabaseSession } from "@/lib/database/with-owner-session";
import {
  StyleProfileRevisionConflictError,
  type StyleProfileRepository,
} from "@/modules/profile/application/style-profile-repository";
import {
  climateProfiles,
  fitPreferences,
  profileColours,
  profileMaterials,
  recommendationModes,
  styleDirections,
  type ClimateProfile,
  type FitPreference,
  type ProfileColour,
  type ProfileMaterial,
  type RecommendationMode,
  type StyleDirection,
  type StyleProfile,
} from "@/modules/profile/domain/style-profile";

type StyleProfileRow = Readonly<{
  owner_id: string;
  revision: number;
  fit_preference: string;
  climate_profile: string;
  recommendation_mode: string;
  style_directions: string[];
  preferred_colours: string[];
  avoided_colours: string[];
  preferred_brands: string[];
  avoided_brands: string[];
  excluded_materials: string[];
  height_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  inseam_cm: number | null;
  shoe_size_eu: string | number | null;
  use_measurements_for_recommendations: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}>;

function enumValue<Value extends string>(
  value: string,
  allowed: readonly Value[],
  field: string,
): Value {
  if (!allowed.includes(value as Value)) {
    throw new Error(`Database returned unsupported ${field}: ${value}`);
  }
  return value as Value;
}

function enumArray<Value extends string>(
  values: readonly string[],
  allowed: readonly Value[],
  field: string,
): readonly Value[] {
  return Object.freeze(values.map((value) => enumValue(value, allowed, field)));
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: StyleProfileRow): StyleProfile {
  const shoeSizeEu = row.shoe_size_eu === null ? null : Number(row.shoe_size_eu);
  if (shoeSizeEu !== null && !Number.isFinite(shoeSizeEu)) {
    throw new Error(`Database returned invalid EU shoe size: ${row.shoe_size_eu}`);
  }

  return Object.freeze({
    ownerId: row.owner_id,
    revision: row.revision,
    fitPreference: enumValue<FitPreference>(
      row.fit_preference,
      fitPreferences,
      "fit preference",
    ),
    climateProfile: enumValue<ClimateProfile>(
      row.climate_profile,
      climateProfiles,
      "climate profile",
    ),
    recommendationMode: enumValue<RecommendationMode>(
      row.recommendation_mode,
      recommendationModes,
      "recommendation mode",
    ),
    styleDirections: enumArray<StyleDirection>(
      row.style_directions,
      styleDirections,
      "style direction",
    ),
    preferredColours: enumArray<ProfileColour>(
      row.preferred_colours,
      profileColours,
      "preferred colour",
    ),
    avoidedColours: enumArray<ProfileColour>(
      row.avoided_colours,
      profileColours,
      "avoided colour",
    ),
    preferredBrands: Object.freeze([...row.preferred_brands]),
    avoidedBrands: Object.freeze([...row.avoided_brands]),
    excludedMaterials: enumArray<ProfileMaterial>(
      row.excluded_materials,
      profileMaterials,
      "excluded material",
    ),
    measurements: Object.freeze({
      heightCm: row.height_cm,
      chestCm: row.chest_cm,
      waistCm: row.waist_cm,
      inseamCm: row.inseam_cm,
      shoeSizeEu,
    }),
    useMeasurementsForRecommendations: row.use_measurements_for_recommendations,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  });
}

const selectedColumns = `
  owner_id,
  revision,
  fit_preference,
  climate_profile,
  recommendation_mode,
  style_directions,
  preferred_colours,
  avoided_colours,
  preferred_brands,
  avoided_brands,
  excluded_materials,
  height_cm,
  chest_cm,
  waist_cm,
  inseam_cm,
  shoe_size_eu,
  use_measurements_for_recommendations,
  created_at,
  updated_at
`;

function values(profile: StyleProfile): readonly unknown[] {
  return [
    profile.ownerId,
    profile.revision,
    profile.fitPreference,
    profile.climateProfile,
    profile.recommendationMode,
    [...profile.styleDirections],
    [...profile.preferredColours],
    [...profile.avoidedColours],
    [...profile.preferredBrands],
    [...profile.avoidedBrands],
    [...profile.excludedMaterials],
    profile.measurements.heightCm,
    profile.measurements.chestCm,
    profile.measurements.waistCm,
    profile.measurements.inseamCm,
    profile.measurements.shoeSizeEu,
    profile.useMeasurementsForRecommendations,
    profile.createdAt,
    profile.updatedAt,
  ];
}

export class PostgresStyleProfileRepository implements StyleProfileRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findByOwner(ownerId: string): Promise<StyleProfile | null> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query<StyleProfileRow>(
        `SELECT ${selectedColumns}
        FROM style_profiles
        WHERE owner_id = $1
        LIMIT 1`,
        [ownerId],
      );

      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async save(profile: StyleProfile, expectedRevision: number): Promise<void> {
    await withOwnerDatabaseSession(this.pool, profile.ownerId, async (session) => {
      if (expectedRevision === 0) {
        const result = await session.query(
          `INSERT INTO style_profiles (
            owner_id,
            revision,
            fit_preference,
            climate_profile,
            recommendation_mode,
            style_directions,
            preferred_colours,
            avoided_colours,
            preferred_brands,
            avoided_brands,
            excluded_materials,
            height_cm,
            chest_cm,
            waist_cm,
            inseam_cm,
            shoe_size_eu,
            use_measurements_for_recommendations,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
          ON CONFLICT (owner_id) DO NOTHING`,
          values(profile),
        );

        if (result.rowCount !== 1) {
          throw new StyleProfileRevisionConflictError();
        }
        return;
      }

      const allValues = values(profile);
      const result = await session.query(
        `UPDATE style_profiles
        SET
          revision = $2,
          fit_preference = $3,
          climate_profile = $4,
          recommendation_mode = $5,
          style_directions = $6,
          preferred_colours = $7,
          avoided_colours = $8,
          preferred_brands = $9,
          avoided_brands = $10,
          excluded_materials = $11,
          height_cm = $12,
          chest_cm = $13,
          waist_cm = $14,
          inseam_cm = $15,
          shoe_size_eu = $16,
          use_measurements_for_recommendations = $17,
          updated_at = $19
        WHERE owner_id = $1 AND revision = $20`,
        [...allValues, expectedRevision],
      );

      if (result.rowCount !== 1) {
        throw new StyleProfileRevisionConflictError();
      }
    });
  }

  async deleteByOwner(ownerId: string, expectedRevision: number): Promise<boolean> {
    return withOwnerDatabaseSession(this.pool, ownerId, async (session) => {
      const result = await session.query(
        `DELETE FROM style_profiles
        WHERE owner_id = $1 AND revision = $2`,
        [ownerId, expectedRevision],
      );

      if (result.rowCount === 0) {
        const current = await session.query(
          "SELECT 1 FROM style_profiles WHERE owner_id = $1",
          [ownerId],
        );
        if (current.rowCount > 0) {
          throw new StyleProfileRevisionConflictError();
        }
        return false;
      }

      return true;
    });
  }
}
