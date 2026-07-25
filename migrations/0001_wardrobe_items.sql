CREATE TABLE IF NOT EXISTS wardrobe_items (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'outerwear',
      'tailoring',
      'knitwear',
      'shirts',
      'tops',
      'trousers',
      'denim',
      'dresses',
      'skirts',
      'footwear',
      'accessories',
      'activewear',
      'other'
    )
  ),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  brand text CHECK (brand IS NULL OR char_length(brand) BETWEEN 1 AND 120),
  primary_color text NOT NULL CHECK (char_length(primary_color) BETWEEN 1 AND 80),
  ownership_status text NOT NULL CHECK (ownership_status IN ('owned', 'wish-list', 'archived')),
  fit_notes text CHECK (fit_notes IS NULL OR char_length(fit_notes) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS wardrobe_items_owner_created_at_idx
  ON wardrobe_items (owner_id, created_at DESC);

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wardrobe_items_owner_isolation ON wardrobe_items;
CREATE POLICY wardrobe_items_owner_isolation
  ON wardrobe_items
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );
