# Sartoria MVP Release Runbook

## Purpose

This runbook defines the minimum safe sequence for promoting the Sartoria MVP to a production environment. It does not provision infrastructure or replace provider-specific operational procedures.

## Release prerequisites

- Node.js matches `.nvmrc`.
- Production secrets are stored in the deployment platform, never in Git.
- PostgreSQL backups and point-in-time recovery are enabled and tested.
- The application database role is not a table owner and cannot bypass row-level security.
- The private media bucket blocks public access and enforces encryption in transit.
- ClamAV is reachable only from the media-processing runtime.
- The media worker endpoint is protected by a unique high-entropy token.
- Better Auth sign-up remains disabled unless an explicit onboarding flow is approved.
- The recommendation mode is `fallback` unless a provider endpoint has completed privacy and security review.

## Required release gates

Run from the exact commit intended for release:

```bash
npm install --no-audit --no-fund
npm run verify:production-env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Do not release if any gate fails or is skipped.

## Migration order

1. Confirm a fresh database backup and record its identifier.
2. Put the application into maintenance mode or prevent writes.
3. Run Better Auth schema migration:

   ```bash
   npm run db:auth:migrate
   ```

4. Run Sartoria application migrations:

   ```bash
   npm run db:migrate
   ```

5. Verify every migration appears once in `sartoria_schema_migrations`.
6. Verify row-level security is enabled and forced on all owner-scoped tables.
7. Start one application instance and execute the production smoke checklist.
8. Restore normal traffic only after the smoke checklist passes.

Application migrations are ordered lexicographically and applied transactionally one file at a time. Never rename an applied migration.

## Production smoke checklist

Use a dedicated non-privileged test account.

- Sign in and sign out successfully.
- Create an owned wardrobe item.
- Create a wish-list item with optional acquisition cost in EUR.
- Upload a valid private image and verify it remains unavailable until scanning succeeds.
- Confirm rejected or malicious media never receives a private read URL.
- Create, edit, and delete an outfit.
- Record and remove a wear event.
- Save, export, and reset a private style profile.
- Generate a deterministic recommendation in fallback mode.
- Create, open, and delete a travel packing plan.
- Open Insights and verify source links, wear attribution, and cost-per-wear.
- Attempt a cross-owner object lookup and confirm it returns no data.

## Rollback

### Application rollback

1. Stop new deployments and restore the previous known-good application image.
2. Keep the database at the newer schema when the previous application version is confirmed forward-compatible.
3. Disable optional provider recommendations by setting `SARTORIA_RECOMMENDATION_MODE=fallback`.
4. Disable media uploads at the routing or feature-control layer if scanning or storage is degraded.

### Database rollback

Schema rollback is a last resort. The migrations are forward-only and may contain data-shape changes.

1. Stop all application writes.
2. Capture the failed release database for investigation.
3. Restore the pre-release backup to a separate database.
4. Validate row counts, owner boundaries, and authentication records.
5. Point the previous application version to the restored database only after validation.

Never manually delete rows from `sartoria_schema_migrations` to simulate rollback.

## Incident stop conditions

Stop or roll back the release immediately when any of these occur:

- authentication accepts an invalid or cross-user session;
- row-level security is absent, bypassed, or owned by the runtime role;
- private media is publicly readable;
- unscanned media becomes available;
- migration state differs between instances;
- secrets appear in logs or client bundles;
- the database backup cannot be restored;
- the production environment verifier fails.

## External production blockers

The repository cannot prove these from CI and they require operator evidence:

- selected hosting platform and regional placement;
- managed PostgreSQL service, backup retention, and restore test;
- S3-compatible storage policy and lifecycle rules;
- ClamAV deployment and signature-update monitoring;
- email delivery and account provisioning for Better Auth;
- observability, alerting, log retention, and incident ownership;
- DNS, TLS, WAF/rate limiting, and deployment rollback controls;
- privacy notice, data retention policy, and user-support process.
