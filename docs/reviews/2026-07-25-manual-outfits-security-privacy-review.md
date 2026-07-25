# Manual Outfits Security and Privacy Review

Date: 2026-07-25  
Scope: Phase 4A deterministic owner-scoped manual outfits  
Review roles: Security Reviewer and Privacy Reviewer  
Change risk: 2 — private composition data with relational wardrobe references

## Reviewed surfaces

- `src/modules/outfits/domain/outfit.ts`
- `src/modules/outfits/application/`
- `src/modules/outfits/infrastructure/`
- `src/modules/outfits/transport/outfit-schema.ts`
- `src/app/outfits/`
- `migrations/0004_outfits.sql`
- outfit domain, application, transport, and end-to-end tests
- `docs/security/threat-models/manual-outfits.md`

## Security findings

### Owner and wardrobe-reference isolation

Status: accepted.

Owner identity is resolved server-side. Every selected wardrobe identifier is loaded through the owner-scoped wardrobe repository before persistence. Missing, archived, and cross-owner references share generic rejection semantics. PostgreSQL uses owner-inclusive foreign keys from outfit memberships to both the outfit and wardrobe item.

### Database isolation

Status: accepted with deployment verification.

Both `outfits` and `outfit_items` enable and force row-level security. Policies use the transaction-local `app.user_id` setting. The runtime role must be verified as non-superuser and without `BYPASSRLS` before production release.

### Composition integrity

Status: accepted.

Domain and transport layers enforce two-to-twelve distinct item identifiers, bounded text, valid identifiers, and deterministic normalisation. PostgreSQL adds uniqueness, position bounds, owner-inclusive foreign keys, and transactional outfit/membership writes.

### Concurrency

Status: accepted.

Updates and deletion foundations use expected revisions. The PostgreSQL adapter changes the parent row with a revision predicate before replacing memberships. Stale operations fail with an explicit conflict.

### Private styling notes

Status: accepted.

Notes are bounded, control characters are rejected while line breaks remain supported, and notes appear only on the authenticated owner's detail page. Notes are excluded from list cards, metadata, logs, and diagnostics.

### Migration transaction ownership

Status: accepted after correction.

The migration originally included explicit transaction statements. Repository migration policy assigns transaction ownership to the migration runner. The explicit `BEGIN` and `COMMIT` statements were removed before merge so schema changes and migration bookkeeping remain atomic under the approved runner.

## Privacy findings

### Data minimisation

Status: accepted.

The slice stores only a user-controlled name, optional broad occasion, optional private note, and existing wardrobe references. It does not collect contacts, precise location, calendar data, inferred attributes, or AI-generated classifications.

### User agency

Status: accepted for Phase 4A.

Composition is fully manual and deterministic. Users can inspect the source pieces and private note. Edit and delete interfaces are intentionally deferred to Phase 4B, while revision-safe application foundations already exist.

### Media reuse

Status: accepted.

Outfit records store no object-store keys. This first UI uses restrained text treatments and links to wardrobe items. Any future previews must continue through the existing ready, owner-authorised, short-lived media boundary.

### Retention

Status: accepted with deployment control.

Outfit deletion support exists at the repository and application layer, but the user-facing delete control is Phase 4B. Backup retention and deletion propagation remain production infrastructure obligations.

## Validation evidence

GitHub Actions run `30171122428` completed successfully after evidence-backed E2E fixes.

Validated:

- ESLint;
- strict TypeScript;
- 54 unit and application tests;
- production Next.js build;
- Chromium installation;
- end-to-end manual outfit creation, detail, source-item display, and list return;
- direct checkbox state verification without unstable derived-text assertions.

## Required deployment controls

Before production activation:

1. apply `0004_outfits.sql` through the approved migration runner;
2. verify both tables have enabled and forced RLS;
3. verify the application role cannot bypass RLS;
4. run two-user cross-owner outfit and wardrobe-reference smoke tests;
5. verify the `ON DELETE RESTRICT` source-item behaviour matches operational expectations;
6. document backup retention and outfit-deletion behaviour;
7. obtain explicit production release approval.

## Decision

Approved for merge into `main` as the deterministic manual-outfit vertical slice. Production activation remains blocked on the deployment controls above.
