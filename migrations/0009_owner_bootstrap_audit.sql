CREATE TABLE sartoria_owner_bootstrap_audit (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  owner_id text NULL,
  isolation_user_id text NULL,
  owner_email_sha256 char(64) NOT NULL CHECK (owner_email_sha256 ~ '^[0-9a-f]{64}$'),
  isolation_email_sha256 char(64) NOT NULL CHECK (isolation_email_sha256 ~ '^[0-9a-f]{64}$'),
  operator_reference text NULL CHECK (
    operator_reference IS NULL OR char_length(operator_reference) BETWEEN 1 AND 160
  ),
  started_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  CHECK (owner_email_sha256 <> isolation_email_sha256),
  CHECK (
    (
      status = 'pending'
      AND owner_id IS NULL
      AND isolation_user_id IS NULL
      AND completed_at IS NULL
    )
    OR
    (
      status = 'completed'
      AND owner_id IS NOT NULL
      AND isolation_user_id IS NOT NULL
      AND owner_id <> isolation_user_id
      AND completed_at IS NOT NULL
    )
  )
);

REVOKE ALL ON TABLE sartoria_owner_bootstrap_audit FROM PUBLIC;

COMMENT ON TABLE sartoria_owner_bootstrap_audit IS
  'Single-use operational evidence for the audited initial owner and isolation-test identity bootstrap. Contains no password or bearer token.';

COMMENT ON COLUMN sartoria_owner_bootstrap_audit.owner_email_sha256 IS
  'SHA-256 digest of the normalized owner email for evidence correlation without storing duplicate plaintext.';

COMMENT ON COLUMN sartoria_owner_bootstrap_audit.isolation_email_sha256 IS
  'SHA-256 digest of the normalized isolation-test email for evidence correlation without storing duplicate plaintext.';

COMMENT ON COLUMN sartoria_owner_bootstrap_audit.status IS
  'Pending is fail-closed and requires operator investigation before any retry. Completed identifies both created users.';
