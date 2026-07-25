# Production Identity and Persistence Handoff

## Objective

Introduce an ADR-backed production identity and PostgreSQL persistence foundation without weakening Sartoria's provider-neutral domain boundaries, private-by-default ownership model, deterministic local development, or AIFramework governance.

## Completed scope

- selected PostgreSQL with node-postgres through explicit repository and database-session interfaces;
- selected Better Auth behind a provider-neutral current-user boundary;
- added production fail-closed database and authentication configuration;
- added Better Auth App Router handlers and a private sign-in experience;
- kept public registration disabled;
- added PostgreSQL wardrobe persistence with parameterised SQL;
- added owner-scoped transactions and transaction-local PostgreSQL user context;
- added forced row-level security and owner isolation policy;
- added atomic application migration execution and Better Auth migration commands;
- updated wardrobe create, list, and detail flows to use current-user and persistence adapters;
- retained explicit development identity and in-memory persistence outside production;
- added repository, configuration, ownership, mapping, rollback, and isolation tests;
- expanded CODEOWNERS and AI readiness protection for authentication, database, and migration surfaces;
- completed a separate Security and Privacy Agent review;
- changed CI diagnostics so ZIP artifacts are generated only after failures.

## Architecture decisions

- `docs/architecture/decisions/0002-postgresql-access-with-node-postgres.md`
- `docs/architecture/decisions/0003-better-auth-for-production-identity.md`

## Validation evidence

GitHub Actions run `30166639958` completed successfully against the final implementation and documentation state before this handoff record was added.

Passed controls:

- dependency installation;
- ESLint;
- strict TypeScript checking;
- 14 unit and application tests;
- production Next.js build;
- Chromium installation;
- end-to-end wardrobe smoke test.

No diagnostic or Playwright ZIP was generated because the run succeeded.

## Security review

The independent review is recorded in:

- `docs/security/reviews/2026-07-25-production-identity-persistence.md`

Blocking findings resolved during review:

- authentication request handlers now validate production configuration before use;
- authenticated wardrobe routes are dynamic and do not request production infrastructure during static build;
- schema application and migration history are committed atomically;
- public account registration remains disabled;
- production cannot fall back to development identity or in-memory persistence.

## Known external boundary

No managed PostgreSQL instance, production secret store, email service, public registration flow, or production account has been provisioned. This repository change is approved for merge but not for production release.

## Remaining release requirements

- provision a managed PostgreSQL database and non-superuser application role;
- apply Better Auth and Sartoria migrations in a disposable environment and then production;
- configure managed secrets, backups, restore testing, rate limiting, abuse monitoring, email verification, password recovery, and incident ownership;
- run deployed cross-user isolation tests;
- obtain explicit human production release approval.

## Exact next action

Merge this validated foundation, then begin Phase 2 with an ADR and acceptance-ready vertical slice for private wardrobe media upload, validation, ownership, scanning, short-lived access, and deletion propagation.
