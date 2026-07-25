ALTER TABLE wardrobe_items
  ADD CONSTRAINT wardrobe_items_id_owner_unique UNIQUE (id, owner_id);

CREATE TABLE wardrobe_media (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  wardrobe_item_id text NOT NULL,
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  declared_content_type text NOT NULL CHECK (
    declared_content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
  ),
  detected_content_type text CHECK (
    detected_content_type IS NULL OR
    detected_content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
  ),
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes BETWEEN 1 AND 20971520),
  quarantine_key text NOT NULL UNIQUE CHECK (quarantine_key LIKE 'quarantine/%'),
  private_key text UNIQUE CHECK (private_key IS NULL OR private_key LIKE 'private/%'),
  status text NOT NULL CHECK (
    status IN ('initiated', 'uploaded', 'scanning', 'ready', 'rejected', 'failed', 'deleted')
  ),
  scanner text,
  scan_reference text,
  rejection_code text CHECK (
    rejection_code IS NULL OR
    rejection_code IN (
      'unsupported-type',
      'malware-detected',
      'empty-object',
      'oversized-object',
      'metadata-mismatch',
      'object-missing'
    )
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT wardrobe_media_item_owner_fk
    FOREIGN KEY (wardrobe_item_id, owner_id)
    REFERENCES wardrobe_items (id, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT wardrobe_media_ready_fields_check CHECK (
    status <> 'ready' OR
    (private_key IS NOT NULL AND detected_content_type IS NOT NULL AND scanner IS NOT NULL)
  ),
  CONSTRAINT wardrobe_media_rejected_reason_check CHECK (
    status <> 'rejected' OR rejection_code IS NOT NULL
  )
);

CREATE INDEX wardrobe_media_owner_item_created_idx
  ON wardrobe_media (owner_id, wardrobe_item_id, created_at DESC)
  WHERE status <> 'deleted';

CREATE INDEX wardrobe_media_pending_scan_idx
  ON wardrobe_media (updated_at ASC)
  WHERE status IN ('uploaded', 'failed');

ALTER TABLE wardrobe_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_media FORCE ROW LEVEL SECURITY;

CREATE POLICY wardrobe_media_owner_isolation
  ON wardrobe_media
  FOR ALL
  USING (
    owner_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    owner_id = nullif(current_setting('app.user_id', true), '')
  );
