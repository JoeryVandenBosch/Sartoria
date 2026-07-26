CREATE TABLE sartoria_owner_bootstrap_audit (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_id text NOT NULL,
  email_sha256 char(64) NOT NULL CHECK (email_sha256 ~ '^[0-9a-f]{64}$'),
  operator_reference text NULL CHECK (
    operator_reference IS NULL OR char_length(operator_reference) BETWEEN 1 AND 160
  ),
  created_at timestamptz NOT NULL
);

REVOKE ALL ON TABLE sartoria_owner_bootstrap_audit FROM PUBLIC;

COMMENT ON TABLE sartoria_owner_bootstrap_audit IS
  'Single-use operational evidence for the audited initial Sartoria owner bootstrap. Contains no password or bearer token.';

COMMENT ON COLUMN sartoria_owner_bootstrap_audit.email_sha256 IS
  'SHA-256 digest of the normalized owner email for evidence correlation without storing a duplicate plaintext email.';
