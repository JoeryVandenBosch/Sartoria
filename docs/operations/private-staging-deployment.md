# Private Staging Deployment

## Goal

Deploy the exact `main` application as a private, HTTPS-only staging environment before any public launch decision. PostgreSQL, object storage and ClamAV remain off public ports; only Caddy exposes the application and the S3-compatible browser endpoint.

## Architecture

- `edge`: Caddy terminates TLS for application and media hostnames.
- `app`: immutable Next.js standalone runtime running as a non-root user.
- `database`: PostgreSQL on the private Compose network.
- `object-storage`: private S3-compatible storage; only the media hostname is proxied for presigned browser operations.
- `clamav`: internal-only malware scanner with persistent signature data.
- `auth-migrations`: one-shot Better Auth migration target.
- `app-migrations`: one-shot Sartoria migration target.
- `object-storage-init`: creates the bucket and denies anonymous access.

The reference staging media dispatcher calls the protected application worker endpoint over HTTPS. `MEDIA_PROCESSING_QUEUE_TOKEN` and `MEDIA_WORKER_TOKEN` therefore contain the same unique high-entropy staging value. Production requires a real queue boundary with separate credentials.

## Prerequisites

1. Linux host with Docker Engine and Docker Compose.
2. Two DNS records pointing to the host: application and private media.
3. TCP 80 and 443 reachable by the TLS issuer.
4. Tested encrypted backup destination outside the host.
5. Approved digest-pinned images for PostgreSQL, MinIO, MinIO client, ClamAV and Caddy.
6. Named operator and incident contact.

Do not deploy floating image tags. Template image values are discovery placeholders and must be replaced by approved immutable digest references.

## Prepare the operator shell

Run all commands in this runbook from `deploy/staging` unless a command explicitly says otherwise.

```bash
cd deploy/staging
cp .env.example .env
cp staging.env.example staging.env
cp minio-cors.xml.example minio-cors.xml
```

Replace every placeholder. Keep `.env`, `staging.env`, generated evidence and `minio-cors.xml` out of Git. Ensure the CORS origin exactly matches the HTTPS application origin.

Load both configuration files into the current trusted operator shell:

```bash
set -a
. ./.env
. ./staging.env
set +a
```

Required properties:

- secrets are unique and randomly generated;
- `SARTORIA_DEPLOYMENT_ENV=staging`;
- `DATABASE_URL` uses `database:5432` in this reference topology;
- `DATABASE_SSL_MODE=disable` is paired with `SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT=true` only inside this isolated staging network;
- `BETTER_AUTH_URL` and `MEDIA_PROCESSING_QUEUE_URL` use the application HTTPS hostname;
- `MEDIA_S3_ENDPOINT` uses the media HTTPS hostname;
- storage credentials match the MinIO Compose credentials;
- recommendation mode remains `fallback`;
- identity bootstrap remains disabled until migrations and health gates pass.

## Validate without starting services

```bash
npm --prefix ../.. run verify:production-env
docker compose config --quiet
docker compose build app auth-migrations app-migrations
```

Stop when the verifier or Compose reports an error, an image is not digest-pinned, or any required value is blank.

## Start dependencies and secure storage

```bash
docker compose up -d database object-storage clamav
docker compose run --rm object-storage-init
```

Apply the edited CORS policy:

```bash
docker compose run --rm \
  -v "$PWD/minio-cors.xml:/config/minio-cors.xml:ro" \
  --entrypoint /bin/sh object-storage-init -ec '
    mc alias set staging http://object-storage:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    mc cors set staging/"$MEDIA_S3_BUCKET" /config/minio-cors.xml
    mc anonymous get staging/"$MEDIA_S3_BUCKET"
  '
```

The final command must report anonymous access as disabled.

## Database migrations

Record a pre-migration database backup identifier before proceeding.

```bash
docker compose --profile operations run --rm auth-migrations
docker compose --profile operations run --rm app-migrations
```

Never reverse the order. Never rename an applied migration. Better Auth migrations must include the Admin plugin fields before identity bootstrap is enabled.

Verify application migration state:

```bash
docker compose exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '
    SELECT filename, applied_at
    FROM sartoria_schema_migrations
    ORDER BY filename;
  '
```

Every repository migration must appear exactly once.

## Start and verify the application

```bash
docker compose up -d app edge
docker compose ps
```

```bash
curl --fail --silent --show-error "https://$STAGING_HOST/api/health/live"
curl --fail --silent --show-error "https://$STAGING_HOST/api/health/ready"
```

Expected bodies are `{"status":"live"}` and `{"status":"ready"}`. HTTP 503 from readiness blocks further testing.

Create non-secret pre-bootstrap evidence:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_COMMIT_SHA="$(git -C ../.. rev-parse HEAD)" \
STAGING_EXPECT_BOOTSTRAP=disabled \
STAGING_EVIDENCE_FILE="staging-evidence-before-bootstrap.json" \
npm --prefix ../.. run verify:staging
```

The verifier records origins, status codes, security headers, commit and timestamps only. It never records credentials.

## Audited identity bootstrap

Public sign-up remains disabled. The internal endpoint creates exactly two normal Better Auth users in one fail-closed operation: the private staging owner and a dedicated isolation-test user.

### Enable the one-time gate

Generate a unique token containing at least 64 high-entropy characters and store it in the secret manager. Temporarily set in `staging.env`:

```dotenv
SARTORIA_OWNER_BOOTSTRAP_ENABLED=true
SARTORIA_OWNER_BOOTSTRAP_TOKEN=<secret-manager-value>
```

Reload configuration and recreate only the app:

```bash
set -a
. ./staging.env
set +a
npm --prefix ../.. run verify:production-env
docker compose up -d --force-recreate app
```

Confirm the endpoint exists but rejects unauthorised access:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_EXPECT_BOOTSTRAP=enabled \
npm --prefix ../.. run verify:staging
```

### Create both identities

Run from the trusted operator shell. Passwords and the bootstrap token are read silently and are not placed in the command line or repository.

```bash
read -r -p "Owner name: " OWNER_NAME
read -r -p "Owner email: " OWNER_EMAIL
read -r -s -p "Owner password: " OWNER_PASSWORD; printf '\n'
read -r -p "Isolation user name: " ISOLATION_NAME
read -r -p "Isolation user email: " ISOLATION_EMAIL
read -r -s -p "Isolation user password: " ISOLATION_PASSWORD; printf '\n'
read -r -p "Operator/change reference: " OPERATOR_REFERENCE
read -r -s -p "Bootstrap token: " BOOTSTRAP_TOKEN; printf '\n'

OWNER_NAME="$OWNER_NAME" \
OWNER_EMAIL="$OWNER_EMAIL" \
OWNER_PASSWORD="$OWNER_PASSWORD" \
ISOLATION_NAME="$ISOLATION_NAME" \
ISOLATION_EMAIL="$ISOLATION_EMAIL" \
ISOLATION_PASSWORD="$ISOLATION_PASSWORD" \
OPERATOR_REFERENCE="$OPERATOR_REFERENCE" \
node -e '
  process.stdout.write(JSON.stringify({
    owner: {
      name: process.env.OWNER_NAME,
      email: process.env.OWNER_EMAIL,
      password: process.env.OWNER_PASSWORD
    },
    isolationUser: {
      name: process.env.ISOLATION_NAME,
      email: process.env.ISOLATION_EMAIL,
      password: process.env.ISOLATION_PASSWORD
    },
    operatorReference: process.env.OPERATOR_REFERENCE
  }))
' | curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "https://$STAGING_HOST/api/internal/bootstrap-owner"

unset OWNER_NAME OWNER_EMAIL OWNER_PASSWORD ISOLATION_NAME ISOLATION_EMAIL \
  ISOLATION_PASSWORD OPERATOR_REFERENCE BOOTSTRAP_TOKEN
```

Success is HTTP 201 with two distinct user identifiers and no session cookie. Store the response only in the restricted deployment evidence location.

### Verify audit state and remove the gate

```bash
docker compose exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '
    SELECT status, owner_id, isolation_user_id, operator_reference, started_at, completed_at
    FROM sartoria_owner_bootstrap_audit;
  '
```

The single row must be `completed` with two distinct identifiers. A `pending` row is a stop condition: preserve logs and database state, disable the endpoint, and investigate. Never delete the audit row or edit Better Auth tables to force a retry.

Immediately set:

```dotenv
SARTORIA_OWNER_BOOTSTRAP_ENABLED=false
```

Delete `SARTORIA_OWNER_BOOTSTRAP_TOKEN` from `staging.env` and the secret manager, reload configuration, validate, and recreate the app:

```bash
unset SARTORIA_OWNER_BOOTSTRAP_TOKEN
set -a
. ./staging.env
set +a
npm --prefix ../.. run verify:production-env
docker compose up -d --force-recreate app
```

Prove removal:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_COMMIT_SHA="$(git -C ../.. rev-parse HEAD)" \
STAGING_EXPECT_BOOTSTRAP=disabled \
STAGING_EVIDENCE_FILE="staging-evidence-after-bootstrap.json" \
npm --prefix ../.. run verify:staging
```

The bootstrap endpoint must return HTTP 404 when disabled.

## Operational observability

The application emits one JSON object per line to stdout. See `docs/operations/observability.md` for the event catalogue and interpretation.

Two variables in `staging.env` govern it:

- `SARTORIA_OBSERVABILITY_SINK` selects the destination. The enumeration is closed: `console` or `none`. An unrecognised value falls back to `console`, never to a network destination.
- `SARTORIA_RELEASE` **must be set to the deployed image tag at deploy time.** Leaving it empty silently drops the field from every event: `resolveRelease` returns `undefined` for anything failing `^[A-Za-z0-9._-]{1,64}$`, so a failure can no longer be correlated with a release. This is a silent degradation, not an error, so it will not be noticed unless checked.

Confirm after starting the application:

```bash
docker compose --env-file staging.env logs app \
  | grep '"name":"database.readiness.checked"' | tail -1
```

The line must contain a `release` field matching the deployed tag. If `release` is absent, `SARTORIA_RELEASE` was empty or malformed.

## Acceptance checklist

Use both staging identities.

- Sign in and sign out with each account.
- Create an owned wardrobe item and wish-list item as the owner.
- Upload valid private media and verify quarantine, scan, promotion and private display.
- Attempt unsupported or rejected media and prove no private read URL is issued.
- Exercise outfit creation, editing, wear history correction and deletion.
- Exercise profile save, export and reset.
- Generate, correct, reject and delete a deterministic recommendation.
- Create, inspect and delete a travel packing plan.
- Verify factual insights and source links.
- Prove the isolation account cannot read owner lists, details, media, exports or guessed identifiers.
- Create an isolation-owned resource and prove the owner cannot read it.
- Restart every container and confirm durable data persists.
- Restore database and object-storage backups into a separate rehearsal environment and validate ownership and media integrity.

## Stop conditions

Stop immediately when authentication or ownership boundaries fail, readiness is degraded, private storage is anonymously readable, unscanned media becomes available, ClamAV signatures are stale, migrations differ from the repository, bootstrap state remains pending, secrets appear in logs or evidence, or backup restoration is unproven.

## Evidence to retain

- exact Git commit and application image digest;
- digest-pinned service references and redacted Compose configuration;
- DNS and TLS proof;
- migration logs and schema-migration rows;
- bucket anonymous-access and CORS proof;
- ClamAV version and signature timestamp;
- staging-verification JSON before and after bootstrap;
- acceptance results for both identities;
- restart-persistence evidence;
- backup and restore identifiers and rehearsal results;
- completed identity-bootstrap audit row;
- named staging operator and incident contact.