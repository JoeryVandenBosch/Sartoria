BEGIN;

CREATE TABLE outfits (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  occasion text CHECK (occasion IS NULL OR char_length(occasion) BETWEEN 1 AND 80),
  styling_notes text CHECK (
    styling_notes IS NULL OR char_length(styling_notes) BETWEEN 1 AND 1000
  ),
  revision integer NOT NULL CHECK (revision >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT outfits_id_owner_unique UNIQUE (id, owner_id),
  CONSTRAINT outfits_updated_after_created CHECK (updated_at >= created_at)
);

CREATE TABLE outfit_items (
  outfit_id text NOT NULL,
  owner_id text NOT NULL,
  wardrobe_item_id text NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 12),
  PRIMARY KEY (outfit_id, wardrobe_item_id),
  CONSTRAINT outfit_items_outfit_position_unique UNIQUE (outfit_id, position),
  CONSTRAINT outfit_items_outfit_owner_fk
    FOREIGN KEY (outfit_id, owner_id)
    REFERENCES outfits (id, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT outfit_items_wardrobe_owner_fk
    FOREIGN KEY (wardrobe_item_id, owner_id)
    REFERENCES wardrobe_items (id, owner_id)
    ON DELETE RESTRICT
);

CREATE INDEX outfits_owner_updated_idx
  ON outfits (owner_id, updated_at DESC, id DESC);

CREATE INDEX outfit_items_owner_item_idx
  ON outfit_items (owner_id, wardrobe_item_id);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits FORCE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items FORCE ROW LEVEL SECURITY;

CREATE POLICY outfits_owner_isolation
  ON outfits
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );

CREATE POLICY outfit_items_owner_isolation
  ON outfit_items
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );

COMMIT;
