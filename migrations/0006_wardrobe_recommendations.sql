CREATE TABLE wardrobe_recommendations (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  occasion text NOT NULL CHECK (char_length(occasion) BETWEEN 1 AND 120),
  request_notes text NULL CHECK (request_notes IS NULL OR char_length(request_notes) <= 500),
  item_reasons jsonb NOT NULL CHECK (
    jsonb_typeof(item_reasons) = 'array'
    AND jsonb_array_length(item_reasons) BETWEEN 2 AND 12
  ),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 600),
  exclusions text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(exclusions) <= 8),
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  provenance_kind text NOT NULL CHECK (provenance_kind IN ('provider', 'fallback')),
  provider text NULL CHECK (provider IS NULL OR char_length(provider) <= 80),
  model text NULL CHECK (model IS NULL OR char_length(model) <= 120),
  reason_code text NULL CHECK (reason_code IS NULL OR char_length(reason_code) <= 80),
  status text NOT NULL CHECK (status IN ('active', 'rejected')),
  correction text NULL CHECK (correction IS NULL OR char_length(correction) <= 600),
  rejection_reason text NULL CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500),
  revision integer NOT NULL CHECK (revision >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  CONSTRAINT wardrobe_recommendations_owner_identity UNIQUE (id, owner_id),
  CONSTRAINT wardrobe_recommendations_provenance_consistency CHECK (
    (provenance_kind = 'provider' AND provider IS NOT NULL AND reason_code IS NULL)
    OR
    (provenance_kind = 'fallback' AND reason_code IS NOT NULL)
  )
);

CREATE INDEX wardrobe_recommendations_owner_updated_idx
  ON wardrobe_recommendations (owner_id, updated_at DESC, id DESC);

CREATE INDEX wardrobe_recommendations_owner_expiry_idx
  ON wardrobe_recommendations (owner_id, expires_at);

ALTER TABLE wardrobe_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_recommendations FORCE ROW LEVEL SECURITY;

CREATE POLICY wardrobe_recommendations_owner_policy
  ON wardrobe_recommendations
  USING (owner_id = current_setting('app.user_id', true))
  WITH CHECK (owner_id = current_setting('app.user_id', true));

COMMENT ON TABLE wardrobe_recommendations IS
  'Owner-scoped structured recommendations and explicit user feedback. Raw provider reasoning is not stored.';
