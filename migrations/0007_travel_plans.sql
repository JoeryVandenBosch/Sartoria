CREATE TABLE travel_plans (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  destination text NULL CHECK (destination IS NULL OR char_length(destination) <= 120),
  start_date date NOT NULL,
  end_date date NOT NULL,
  climate text NOT NULL CHECK (climate IN ('cold', 'cool', 'mild', 'warm', 'hot', 'mixed')),
  activities text[] NOT NULL CHECK (cardinality(activities) BETWEEN 1 AND 6),
  laundry_access text NOT NULL CHECK (laundry_access IN ('none', 'limited', 'regular')),
  notes text NULL CHECK (notes IS NULL OR char_length(notes) <= 1000),
  packing_warnings text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(packing_warnings) <= 12),
  revision integer NOT NULL CHECK (revision >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT travel_plans_date_order CHECK (end_date >= start_date),
  CONSTRAINT travel_plans_max_duration CHECK (end_date - start_date <= 59),
  CONSTRAINT travel_plans_owner_identity UNIQUE (id, owner_id)
);

CREATE TABLE travel_plan_items (
  travel_plan_id text NOT NULL,
  owner_id text NOT NULL,
  wardrobe_item_id text NOT NULL,
  position integer NOT NULL CHECK (position BETWEEN 0 AND 59),
  PRIMARY KEY (travel_plan_id, wardrobe_item_id),
  CONSTRAINT travel_plan_items_unique_position UNIQUE (travel_plan_id, position),
  CONSTRAINT travel_plan_items_plan_owner_fk
    FOREIGN KEY (travel_plan_id, owner_id)
    REFERENCES travel_plans (id, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT travel_plan_items_wardrobe_owner_fk
    FOREIGN KEY (wardrobe_item_id, owner_id)
    REFERENCES wardrobe_items (id, owner_id)
    ON DELETE RESTRICT
);

CREATE INDEX travel_plans_owner_updated_idx
  ON travel_plans (owner_id, updated_at DESC, id DESC);

CREATE INDEX travel_plan_items_owner_plan_idx
  ON travel_plan_items (owner_id, travel_plan_id, position);

ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE travel_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_plan_items FORCE ROW LEVEL SECURITY;

CREATE POLICY travel_plans_owner_policy
  ON travel_plans
  USING (owner_id = current_setting('app.user_id', true))
  WITH CHECK (owner_id = current_setting('app.user_id', true));

CREATE POLICY travel_plan_items_owner_policy
  ON travel_plan_items
  USING (owner_id = current_setting('app.user_id', true))
  WITH CHECK (owner_id = current_setting('app.user_id', true));

COMMENT ON TABLE travel_plans IS
  'Owner-scoped date-only travel plans with broad destination and deterministic packing controls.';

COMMENT ON TABLE travel_plan_items IS
  'Owner-verified wardrobe membership for private travel packing lists.';
