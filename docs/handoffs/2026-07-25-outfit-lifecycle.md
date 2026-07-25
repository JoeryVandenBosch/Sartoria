# Outfit Lifecycle and Wear History Handoff

Date: 2026-07-25  
Branch: `feature/outfit-lifecycle`  
Pull request: #10  
Risk: 3 — private behavioural history and destructive data operations

## Delivered

- revision-safe outfit editing with owner and wardrobe-membership revalidation;
- explicit confirmation and expected-revision protection for outfit deletion;
- date-only, user-entered private wear events;
- optional private wear notes limited to 500 characters;
- deterministic wear count and last-worn aggregates;
- newest-first private wear-event history;
- individual event correction through owner-scoped deletion;
- cascade removal of wear history when an outfit is deleted;
- deterministic in-memory development repository;
- PostgreSQL wear-event repository;
- `outfit_wear_events` migration with owner-inclusive cascade foreign key;
- enabled and forced RLS;
- owner-facing lifecycle UI on outfit detail and factual aggregates on collection cards;
- ADR, feature acceptance criteria, review evidence, roadmap state, and documentation updates;
- wear-event domain, application, transport, deletion, aggregate, and end-to-end coverage.

## Validation evidence

Successful GitHub Actions run: `30172054674`.

- ESLint: passed;
- strict TypeScript: passed;
- unit and application tests: 65 passed;
- production build: passed;
- Chromium installation: passed;
- end-to-end smoke tests: 5 passed;
- lifecycle flow covers edit, explicit wear recording, factual aggregation, event correction, revision increment, and confirmed outfit deletion.

The first browser run identified ambiguous private-note locators because the owner detail text and hidden edit textarea intentionally contain the same value. Assertions are now scoped to the labelled owner-only detail region. The final gate is green.

## Security and privacy decisions

- current owner identity is resolved only on the server;
- stale edits and deletes fail through expected revisions;
- edited compositions revalidate every wardrobe reference;
- wear history is explicit and never inferred;
- dates are stored without precise time or location;
- notes stay off collection cards, metadata, logs, and telemetry;
- event and outfit deletion are owner-scoped;
- production cascade deletion includes owner identity;
- the wear-event table forces RLS;
- local development remains deterministic without external infrastructure.

## Production work still blocked

- apply `0005_outfit_wear_events.sql` through the approved migration path;
- verify the production runtime role cannot bypass RLS;
- run two-user cross-owner edit, wear, event-delete, and outfit-delete smoke tests;
- verify cascade deletion retains wardrobe items and media;
- document backup retention and restoration expectations;
- verify server-clock behaviour for future-date validation;
- obtain explicit production release approval.

## Rollback

Hide outfit edit, delete, and wear-history controls while retaining read-only outfit pages. The migration is additive. Do not drop the table after user data exists; use an approved forward migration or restore process.

## Exact next action

Begin Phase 5 with an ADR and acceptance criteria for a provider-neutral recommendation gateway. Require schema-validated responses, explicit source wardrobe and outfit references, user-visible reasoning, confidence and exclusions, correction and rejection controls, privacy-safe context loading, and a deterministic no-provider fallback. Do not enable autonomous purchasing or irreversible actions.
