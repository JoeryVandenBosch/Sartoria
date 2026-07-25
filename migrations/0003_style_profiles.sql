CREATE TABLE style_profiles (
  owner_id text PRIMARY KEY,
  revision integer NOT NULL CHECK (revision >= 1),
  fit_preference text NOT NULL CHECK (
    fit_preference IN ('slim', 'tailored', 'regular', 'relaxed')
  ),
  climate_profile text NOT NULL CHECK (
    climate_profile IN ('cold', 'temperate', 'warm', 'mixed', 'tropical')
  ),
  recommendation_mode text NOT NULL CHECK (
    recommendation_mode IN ('wardrobe-first', 'balanced', 'shopping-open')
  ),
  style_directions text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(style_directions) <= 8 AND
    style_directions <@ ARRAY[
      'classic',
      'italian-smart-casual',
      'minimal',
      'business',
      'streetwear',
      'workwear',
      'athleisure',
      'romantic',
      'bohemian',
      'avant-garde'
    ]::text[]
  ),
  preferred_colours text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    preferred_colours <@ ARRAY[
      'black', 'white', 'navy', 'blue', 'grey', 'beige', 'brown',
      'green', 'red', 'pink', 'purple', 'yellow', 'orange', 'metallic'
    ]::text[]
  ),
  avoided_colours text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    avoided_colours <@ ARRAY[
      'black', 'white', 'navy', 'blue', 'grey', 'beige', 'brown',
      'green', 'red', 'pink', 'purple', 'yellow', 'orange', 'metallic'
    ]::text[] AND
    NOT (preferred_colours && avoided_colours)
  ),
  preferred_brands text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(preferred_brands) <= 20
  ),
  avoided_brands text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(avoided_brands) <= 20
  ),
  excluded_materials text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    excluded_materials <@ ARRAY[
      'wool', 'cashmere', 'cotton', 'linen', 'leather',
      'suede', 'silk', 'synthetic', 'down', 'fur'
    ]::text[]
  ),
  height_cm integer CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  chest_cm integer CHECK (chest_cm IS NULL OR chest_cm BETWEEN 50 AND 200),
  waist_cm integer CHECK (waist_cm IS NULL OR waist_cm BETWEEN 40 AND 200),
  inseam_cm integer CHECK (inseam_cm IS NULL OR inseam_cm BETWEEN 40 AND 130),
  shoe_size_eu numeric(3, 1) CHECK (
    shoe_size_eu IS NULL OR
    (shoe_size_eu BETWEEN 25 AND 55 AND mod(shoe_size_eu * 2, 1) = 0)
  ),
  use_measurements_for_recommendations boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (updated_at >= created_at)
);

ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY style_profiles_owner_isolation
  ON style_profiles
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );
