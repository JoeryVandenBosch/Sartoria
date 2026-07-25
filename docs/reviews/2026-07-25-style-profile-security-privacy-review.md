# Style Profile Security and Privacy Review

Date: 2026-07-25  
Scope: Phase 3 owner-scoped style profile and preferences  
Review roles: Security Reviewer and Privacy Reviewer  
Change risk: 3 — sensitive personal preference data, optional body measurements, owner-scoped persistence, export, and deletion

## Reviewed surfaces

- `src/modules/profile/domain/style-profile.ts`
- `src/modules/profile/application/`
- `src/modules/profile/infrastructure/`
- `src/modules/profile/transport/style-profile-schema.ts`
- `src/app/profile/`
- `src/app/api/profile/`
- `migrations/0003_style_profiles.sql`
- profile unit, application, transport, and end-to-end tests

## Security findings

### Ownership isolation

Status: accepted.

All application reads, saves, exports, and resets obtain the current owner identity server-side. Repository operations use the owner identifier as their lookup key. PostgreSQL access is additionally constrained through forced row-level security using the transaction-scoped `app.user_id` setting.

### Concurrency and stale changes

Status: accepted.

The profile uses monotonically increasing revisions. Saves and resets require the caller's expected revision and fail when a concurrent update has occurred. The PostgreSQL adapter applies the same revision predicate inside the owner-scoped transaction.

### Input integrity

Status: accepted.

The transport schema restricts all enum values, collection sizes, brand lengths, measurement ranges, and shoe-size increments. Domain normalisation independently rejects duplicate signals and preferred/avoided overlap. Server-side validation remains authoritative.

### Export and reset

Status: accepted.

Export requires the current owner identity and returns `private, no-store`, attachment disposition, and `nosniff` headers. Reset is owner-scoped, revision-protected, idempotent for absence, and does not affect wardrobe items or private media.

### Production fail-closed behaviour

Status: accepted with deployment control.

Production uses PostgreSQL through the existing fail-closed persistence selector. Production deployment still requires the approved database migration, application-role privileges, forced RLS verification, and release approval.

## Privacy findings

### Data minimisation

Status: accepted.

The profile stores broad climate context rather than precise location. Style, colour, brand, and material signals are optional user-managed preferences. No inferred sensitive attributes are added.

### Optional measurements

Status: accepted.

Measurements may be stored for the user's private reference, but `toRecommendationProfile` removes all measurements unless the user explicitly enables recommendation use. This consent switch is separate from merely entering the values.

### User control

Status: accepted.

The user can inspect and correct every field, export the complete profile as JSON, or reset the profile. The UI explains the private and optional nature of the data.

### Retention and deletion

Status: accepted for the current scope.

Reset deletes the profile record. Database backups and production retention schedules remain infrastructure controls and must be documented before production release.

## Validation evidence

GitHub Actions run `30170036621` completed successfully after evidence-backed fixes.

Validated:

- ESLint;
- strict TypeScript with exact optional property types;
- 41 unit and application tests;
- production Next.js build;
- Chromium installation;
- end-to-end create, export, reload, and reset profile flow;
- retry isolation for deterministic CI behaviour.

## Required deployment controls

Before production release:

1. apply `0003_style_profiles.sql` through the approved migration process;
2. verify the runtime database role cannot bypass RLS;
3. verify `FORCE ROW LEVEL SECURITY` remains active;
4. verify export responses are not cached by the hosting layer;
5. document backup retention and deletion expectations;
6. complete explicit production release approval.

## Decision

Approved for merge into `main` as an implementation-complete vertical slice. Production activation remains blocked on the deployment controls above.
