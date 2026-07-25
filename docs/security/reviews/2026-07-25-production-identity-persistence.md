# Security and Privacy Review: Production Identity and Persistence

- Date: 2026-07-25
- Review role: Security and Privacy Agent
- Change risk: 4
- Scope: PR #6 production identity and PostgreSQL persistence foundation
- Release decision: approved for repository merge; not approved for production release

## Review boundaries

Reviewed authentication configuration, authenticated current-user resolution, wardrobe repository selection, owner-scoped SQL, transaction handling, row-level security, migration execution, secrets handling, development fallbacks, sign-in behaviour, tests, and operational documentation.

## Blocking findings resolved

### Authentication route could initialise with development fallback configuration

The Better Auth route originally exposed handlers without validating production configuration at request time. The route now calls `assertAuthenticationRuntimeConfigured()` before every GET and POST request. Production and explicit Better Auth mode require `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`.

### Migration history was not atomic with schema application

The migration runner originally applied SQL and recorded migration history separately. Transaction ownership now belongs to the runner, which applies the migration and its history record atomically and rolls both back on failure.

### Authenticated pages were considered during static production rendering

Protected wardrobe pages are now explicitly dynamic. This prevents build-time database access while preserving request-time session and ownership enforcement.

## Verified controls

- Production cannot select the development identity adapter.
- Production cannot select in-memory wardrobe persistence.
- Wardrobe reads and writes include the authenticated owner identifier.
- SQL values are parameterised.
- Repository operations establish transaction-local PostgreSQL owner context.
- The wardrobe table has owner and value constraints, an owner/time index, forced row-level security, and an owner policy.
- Authentication library types remain behind the current-user boundary.
- Public sign-up is disabled.
- Authentication telemetry is disabled.
- Passwords, session tokens, database URLs, fit notes, and wardrobe content are not added to operational logs.
- CI validates linting, strict types, tests, production build, and the development-mode end-to-end wardrobe flow.

## Residual release risks

The following are external deployment controls and remain mandatory before production release:

1. Provision a managed PostgreSQL database and a non-superuser application role.
2. Confirm the application role does not own protected tables and cannot bypass row-level security.
3. Store high-entropy authentication and database secrets in managed secret storage.
4. Apply and review Better Auth and Sartoria migrations in a disposable environment before production.
5. Create initial accounts through an approved administrative procedure while public registration remains disabled.
6. Configure password recovery, email verification, rate limiting, abuse monitoring, audit retention, backup, restore, and incident ownership before public onboarding.
7. Execute authenticated cross-user isolation tests against the deployed database.

## Decision

The implementation is approved for merge into `main`. Production release remains blocked until the residual release risks above have verified evidence and explicit human approval.
