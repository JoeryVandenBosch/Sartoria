CREATE TABLE outfit_wear_events (
  id text PRIMARY KEY,
  outfit_id text NOT NULL,
  owner_id text NOT NULL,
  worn_on date NOT NULL CHECK (worn_on >= DATE '1900-01-01'),
  note text CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL,
  CONSTRAINT outfit_wear_events_outfit_owner_fk
    FOREIGN KEY (outfit_id, owner_id)
    REFERENCES outfits (id, owner_id)
    ON DELETE CASCADE
);

CREATE INDEX outfit_wear_events_owner_outfit_date_idx
  ON outfit_wear_events (owner_id, outfit_id, worn_on DESC, created_at DESC, id DESC);

ALTER TABLE outfit_wear_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_wear_events FORCE ROW LEVEL SECURITY;

CREATE POLICY outfit_wear_events_owner_isolation
  ON outfit_wear_events
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );
