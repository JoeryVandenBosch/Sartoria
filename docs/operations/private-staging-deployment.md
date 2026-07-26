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
- `DATABASE_URL` points to `database:5432` in this reference topology;
- `BETTER_AUTH_URL` and `MEDIA_PROCESSING_QUEUE_URL` use the public HTTPS staging hostname;
- `MEDIA_S3_ENDPOINT` uses the HTTPS media hostname;
- storage credentials match the MinIO credentials supplied through Compose;
- recommendation mode remains `fallback`.

## Validate configuration without starting services

```bash
docker compose config --quiet
docker compose build app auth-migrations app-migrations
```

Stop when Compose reports missing variables, an image is not digest-pinned, or a secret is still blank.

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

Never reverse the order. Never rename an applied Sartoria migration.

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

## Initial owner account gate

Better Auth sign-up is deliberately disabled. Do not temporarily enable public sign-up. Before staging acceptance, implement or approve a one-time, audited owner bootstrap procedure and record:

- the operator;
- execution timestamp;
- owner email;
- resulting user identifier;
- confirmation that bootstrap access was removed immediately afterwards.

This remains a staging blocker until an audited bootstrap path is present.

## Acceptance checklist

Use the dedicated staging owner account.

- Sign in and sign out.
- Create an owned wardrobe item and a wish-list item.
- Upload a valid private image; verify quarantine, scan and private display.
- Attempt an unsupported file and confirm it never receives a private read URL.
- Create, edit and delete an outfit.
- Record and delete a wear event.
- Save and export the private style profile.
- Generate a deterministic recommendation.
- Create and delete a travel packing plan.
- Verify factual insights and source links.
- Verify a second account cannot read the first account's objects.
- Restart every container and confirm data persists.
- Restore the database and object-storage backups to a separate rehearsal environment.

## Stop conditions

Stop staging validation immediately when authentication boundaries fail, readiness is degraded, a private object is anonymously readable, unscanned media is available, ClamAV signatures are stale, migrations differ from the repository, secrets appear in logs, or backup restoration is unproven.

## Evidence to retain

- exact Git commit and container image digest;
- redacted Compose configuration;
- DNS and TLS proof;
- migration output;
- bucket anonymous-access and CORS proof;
- ClamAV version and signature timestamp;
- health-check output;
- acceptance-test results;
- backup and restore identifiers;
- owner-bootstrap audit record;
- named staging operator and incident contact.
