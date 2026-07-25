# Database Migrations

Sartoria keeps application schema migrations as ordered SQL files in this directory.

## Required environment

- `DATABASE_URL`
- `DATABASE_SSL_MODE=require` for managed production databases, or `disable` only for an approved local environment
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

Never commit real values.

## Apply application migrations

```bash
npm run db:migrate
```

The runner records completed files in `sartoria_schema_migrations` and refuses to continue without `DATABASE_URL`.

## Apply Better Auth migrations

```bash
npm run db:auth:migrate
```

Review generated or proposed authentication schema changes before applying them outside a disposable environment.

## Deployment order

1. Back up the target database.
2. Apply Better Auth migrations.
3. Apply Sartoria application migrations.
4. Verify table ownership and application-role privileges.
5. Verify row-level security is enabled and forced on user-owned application tables.
6. Deploy the application with production authentication and persistence modes enabled.
7. Run authenticated ownership smoke tests.

## Rollback

The initial migration is additive. Do not drop tables containing user data. Rollback requires an approved export, restore, or forward migration and explicit Security and Privacy review.
