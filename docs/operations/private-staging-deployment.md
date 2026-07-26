# Private Staging Deployment

## Goal

Deploy the exact `main` application as a private, HTTPS-only staging environment before any public launch decision. This reference topology keeps PostgreSQL, object storage and ClamAV off public ports; only Caddy exposes the application and S3-compatible upload endpoint.

## Architecture

- `edge`: Caddy terminates TLS for the application and media-storage hostnames.
- `app`: immutable Next.js standalone runtime running as a non-root user.
- `database`: PostgreSQL on the private Docker network.
- `object-storage`: private S3-compatible storage; only the storage hostname is proxied through Caddy for presigned browser operations.
- `clamav`: internal-only malware scanner with persistent signature data.
- `auth-migrations`: one-shot Better Auth migration target.
- `app-migrations`: one-shot Sartoria migration target.
- `object-storage-init`: creates the bucket and denies anonymous access.

The direct staging media dispatcher calls the protected application worker endpoint over HTTPS. In this reference topology, `MEDIA_PROCESSING_QUEUE_TOKEN` and `MEDIA_WORKER_TOKEN` must contain the same high-entropy value. Production should use a real queue boundary with separate credentials.

## Prerequisites

1. A Linux host with Docker Engine and Docker Compose.
2. Two DNS records pointing to the host:
   - application hostname;
   - private media hostname.
3. TCP 80 and 443 reachable by the TLS issuer.
4. A tested encrypted backup destination outside the host.
5. Approved immutable image digests for PostgreSQL, MinIO, the MinIO client, ClamAV and Caddy.

Do not deploy floating image tags. The values in `.env.example` are discovery placeholders and must be replaced with approved digest-pinned references.

## Prepare configuration

```bash
cd deploy/staging
cp .env.example .env
cp staging.env.example staging.env
cp minio-cors.xml.example minio-cors.xml
```

Replace every placeholder. Keep `.env`, `staging.env` and `minio-cors.xml` out of Git. Ensure the CORS origin exactly matches `BETTER_AUTH_URL` and the staging application hostname.

Required properties:

- all secrets are unique, randomly generated and at least 32 characters where required;
- `SARTORIA_DEPLOYMENT_ENV=staging`;
- `DATABASE_URL` points to `database:5432` in this reference topology;
- `DATABASE_SSL_MODE=disable` is paired with `SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT=true` only for this isolated staging network;
- `BETTER_AUTH_URL` and `MEDIA_PROCESSING_QUEUE_URL` use the public HTTPS staging hostname;
- `MEDIA_S3_ENDPOINT` uses the HTTPS media hostname;
- storage credentials match the MinIO credentials supplied through Compose;
- recommendation mode remains `fallback`;
- owner bootstrap remains disabled until the migration and health gates pass.

## Validate configuration without starting services

```bash
set -a
. ./staging.env
set +a
npm run verify:production-env

docker compose config --quiet
docker compose build app auth-migrations app-migrations
```

Stop when the environment verifier or Compose reports an error, an image is not digest-pinned, or a secret is still blank.

## Start dependencies

```bash
docker compose up -d database object-storage clamav
docker compose run --rm object-storage-init
```

Apply the edited CORS policy using the approved MinIO client image:

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

Take and record a database-volume backup before migrations.

```bash
docker compose --profile operations run --rm auth-migrations
docker compose --profile operations run --rm app-migrations
```

Never reverse the order. Never rename an applied Sartoria migration. The Better Auth migration must include the Admin plugin fields before the identity bootstrap endpoint is used.

## Start the application

```bash
docker compose up -d app edge
docker compose ps
```

Verify:

```bash
curl --fail --silent --show-error "https://$STAGING_HOST/api/health/live"
curl --fail --silent --show-error "https://$STAGING_HOST/api/health/ready"
```

Expected responses are `{"status":"live"}` and `{"status":"ready"}`. Readiness returning HTTP 503 blocks further testing.

Run the automated unauthenticated staging checks:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_COMMIT_SHA="$(git rev-parse HEAD)" \
STAGING_EXPECT_BOOTSTRAP=disabled \
STAGING_EVIDENCE_FILE="staging-evidence-before-bootstrap.json" \
npm run verify:staging
```

The evidence file contains only origins, status codes, headers, commit and timestamps. It contains no credentials.

## Audited identity bootstrap

Public sign-up remains disabled. The internal endpoint creates exactly two normal Better Auth users: the staging owner and a dedicated isolation-test user. It can run only once and only while explicitly enabled in staging.

### Enable the one-time gate

Generate a unique token with at least 64 high-entropy characters and store it in the secret manager. Temporarily set in `staging.env`:

```dotenv
SARTORIA_OWNER_BOOTSTRAP_ENABLED=true
SARTORIA_OWNER_BOOTSTRAP_TOKEN=<secret-manager-reference-value>
```

Recreate only the application container:

```bash
docker compose up -d --force-recreate app
```

Confirm the endpoint is enabled but unauthorised without the token:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_EXPECT_BOOTSTRAP=enabled \
npm run verify:staging
```

### Create both accounts

Run from a trusted operator shell. Values are read silently and sent through standard input so passwords do not appear in the command line.

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

A successful response is HTTP 201 and returns both user identifiers without session cookies. Record the response in the restricted deployment evidence location.

### Verify and remove bootstrap access

Inspect the audit state without exposing passwords or the bearer token:

```bash
set -a
. ./.env
set +a

docker compose exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '
    SELECT status, owner_id, isolation_user_id, operator_reference, started_at, completed_at
    FROM sartoria_owner_bootstrap_audit;
  '
```

The single row must be `completed` with two distinct user identifiers. A `pending` row is a stop condition: preserve logs and database state, disable the endpoint, and investigate. Do not delete the audit row or directly edit Better Auth tables to retry.

Immediately change `staging.env` to:

```dotenv
SARTORIA_OWNER_BOOTSTRAP_ENABLED=false
```

Delete `SARTORIA_OWNER_BOOTSTRAP_TOKEN` from the environment and secret manager, then recreate the app:

```bash
docker compose up -d --force-recreate app
```

Prove removal:

```bash
STAGING_BASE_URL="https://$STAGING_HOST" \
STAGING_STORAGE_URL="https://$STAGING_STORAGE_HOST" \
STAGING_MEDIA_BUCKET="$MEDIA_S3_BUCKET" \
STAGING_COMMIT_SHA="$(git rev-parse HEAD)" \
STAGING_EXPECT_BOOTSTRAP=disabled \
STAGING_EVIDENCE_FILE="staging-evidence-after-bootstrap.json" \
npm run verify:staging
```

The bootstrap endpoint must return HTTP 404 when disabled.

## Acceptance checklist

Use the staging owner and isolation-test accounts created above.

- Sign in and sign out with both accounts.
- Create an owned wardrobe item and a wish-list item as the owner.
- Upload a valid private image; verify quarantine, scan and private display.
- Attempt an unsupported file and confirm it never receives a private read URL.
- Create, edit and delete an outfit.
- Record and delete a wear event.
- Save and export the private style profile.
- Generate a deterministic recommendation.
- Create and delete a travel packing plan.
- Verify factual insights and source links.
- Verify the isolation account cannot read any owner resource by list, detail, media URL or guessed identifier.
- Create one isolated resource and prove the owner cannot read it.
- Restart every container and confirm data persists.
- Restore the database and object-storage backups to a separate rehearsal environment.

## Stop conditions

Stop staging validation immediately when authentication boundaries fail, readiness is degraded, a private object is anonymously readable, unscanned media is available, ClamAV signatures are stale, migrations differ from the repository, bootstrap state remains pending, secrets appear in logs, or backup restoration is unproven.

## Evidence to retain

- exact Git commit and container image digest;
- redacted Compose configuration;
- DNS and TLS proof;
- migration output;
- bucket anonymous-access and CORS proof;
- ClamAV version and signature timestamp;
- automated staging-verification JSON before and after bootstrap;
- acceptance-test results for both identities;
- backup and restore identifiers;
- completed identity-bootstrap audit row;
- named staging operator and incident contact.
