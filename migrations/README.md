# Database Migrations

Sartoria keeps application schema migrations as ordered, forward-only SQL files in this directory. Applied file names are immutable.

## Required environment

- `DATABASE_URL`
- `DATABASE_SSL_MODE=require` for managed production databases
- `DATABASE_SSL_MODE=disable` only for the explicitly approved isolated staging topology with `SARTORIA_DEPLOYMENT_ENV=staging` and `SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT=true`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

Never commit real values.

## Apply Better Auth migrations first

```bash
npm run db:auth:migrate
```

Review generated or proposed authentication schema changes before applying them outside a disposable environment. The current authentication configuration includes the Better Auth Admin plugin solely for guarded server-side staging identity creation, so its required user administration fields must exist before the one-time bootstrap endpoint is enabled.

## Apply Sartoria migrations second

```bash
npm run db:migrate
```

The runner applies each SQL file and its `sartoria_schema_migrations` record in one transaction. It rolls back both when any statement fails and refuses to start without `DATABASE_URL`.

Migration SQL files must not contain their own `BEGIN`, `COMMIT`, or `ROLLBACK` statements because transaction ownership belongs to the runner.

Current application migration sequence:

1. wardrobe items and owner isolation;
2. private media lifecycle;
3. private style profile;
4. outfits and owner-inclusive membership;
5. explicit outfit wear history;
6. explainable recommendations;
7. travel plans and owner-inclusive packing membership;
8. optional user-provided wardrobe acquisition cost;
9. fail-closed, one-time staging owner and isolation-identity bootstrap audit.

Migration `0009_owner_bootstrap_audit.sql` records no password or bearer token. A `pending` row is an operational stop condition and must be investigated; do not delete or edit the row to simulate a retry.

## Deployment order

1. Record the exact application commit and image digest.
2. Back up the target database and record the backup identifier.
3. Prevent application writes or keep application instances stopped.
4. Apply Better Auth migrations.
5. Apply Sartoria application migrations.
6. Verify every expected file appears exactly once in `sartoria_schema_migrations`.
7. Verify table ownership and runtime-role privileges.
8. Verify row-level security is enabled and forced on every owner-scoped table.
9. Deploy one application instance with production authentication and persistence modes enabled.
10. Run readiness, authenticated ownership, cross-owner denial, and private-media smoke tests.
11. Restore normal traffic only after all stop conditions are clear.

## Rollback

Migrations are forward-only. Never remove rows from `sartoria_schema_migrations`, rename an applied file, or manually drop user tables to imitate rollback.

Application rollback may keep the newer schema only when the previous application is proven forward-compatible. Database rollback requires stopped writes, preservation of the failed database, restoration of the recorded pre-release backup to a separate target, validation of authentication records, owner boundaries and row counts, and explicit Security and Privacy approval before traffic is moved.