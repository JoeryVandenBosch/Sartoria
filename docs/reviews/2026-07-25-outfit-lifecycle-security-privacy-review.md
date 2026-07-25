# Outfit Lifecycle and Wear History Security and Privacy Review

Date: 2026-07-25  
Scope: Phase 4B revision-safe outfit lifecycle and explicit private wear history  
Review roles: Security Reviewer and Privacy Reviewer  
Change risk: 3 — behavioural history and destructive private-data operations

## Reviewed surfaces

- `src/modules/outfits/domain/outfit-wear-event.ts`
- `src/modules/outfits/application/` lifecycle and wear-history services
- `src/modules/outfits/infrastructure/` wear-history adapters
- `src/modules/outfits/transport/outfit-wear-event-schema.ts`
- `src/app/outfits/[outfitId]/`
- outfit and wear-event deletion endpoints
- `migrations/0005_outfit_wear_events.sql`
- lifecycle and wear-history tests
- `docs/security/threat-models/manual-outfits.md`
- ADR 0007 and feature 006 acceptance criteria

## Security findings

### Owner isolation

Status: accepted.

Outfit edits, outfit deletion, wear recording, wear queries, and event deletion all derive the current owner identity server-side. Outfit access remains keyed by outfit ID and owner ID. Wear-event persistence includes owner identity and forced RLS. Inaccessible identifiers use not-found or generic unavailable semantics.

### Revision-safe destructive changes

Status: accepted.

Outfit edits and deletion require the current expected revision. Stale operations fail instead of overwriting or removing newer data. The user-facing delete control requires explicit confirmation. PostgreSQL membership replacement remains atomic with the parent revision update.

### Wear-event integrity

Status: accepted.

Wear dates must be valid date-only values from 1900-01-01 through the current UTC date. Private notes are optional, bounded to 500 characters, preserve intentional line breaks, and reject unsafe control characters. Multiple explicit events on one date are allowed through distinct event identifiers.

### Cascade deletion

Status: accepted.

The production foreign key from wear events to outfits includes owner identity and uses `ON DELETE CASCADE`. The deterministic development orchestration removes the outfit and then clears its owner-scoped event records. Individual event deletion is separately owner-scoped.

### Database policy

Status: accepted with deployment verification.

`outfit_wear_events` enables and forces row-level security using the transaction-local `app.user_id` setting. The production runtime role must be verified as non-superuser and without `BYPASSRLS` before activation.

### Error and telemetry exposure

Status: accepted.

Private notes are not included in page metadata, collection cards, logs, telemetry, or diagnostic messages. Validation responses do not disclose another owner's outfit or event existence.

## Privacy findings

### Explicit rather than inferred behaviour

Status: accepted.

Wear history is created only by a deliberate user action. Sartoria does not infer wear from page activity, media, calendar data, location, contacts, recommendations, or background tracking.

### Data minimisation

Status: accepted.

A wear event contains a date, optional note, outfit reference, owner identifier, generated ID, and creation timestamp. No precise wear time, location, venue, calendar identifier, or inferred occasion is stored.

### User correction and deletion

Status: accepted.

Users can remove an individual wear event and recalculate factual count and last-worn values. They can delete an outfit and all associated wear history while retaining source wardrobe items and media. Outfit edits remain user-controlled and revision-safe.

### Factual aggregates

Status: accepted.

Wear count and last-worn values are deterministic aggregates of explicit events. No score, prediction, behavioural judgement, or recommendation is generated.

### Retention

Status: accepted with deployment control.

Application deletion removes current records. Production backup retention, restoration windows, and deletion expectations remain infrastructure controls that must be documented before release.

## Validation evidence

GitHub Actions run `30172054674` completed successfully after evidence-backed locator corrections.

Validated:

- ESLint;
- strict TypeScript;
- 65 unit and application tests;
- production Next.js build;
- Chromium installation;
- five end-to-end flows, including outfit edit, explicit wear record, event correction, revision increment, and confirmed outfit deletion;
- private-note assertions scoped to the owner-only detail region so hidden edit controls do not create ambiguous test results.

## Required deployment controls

Before production activation:

1. apply `0005_outfit_wear_events.sql` through the approved migration runner;
2. verify the table has enabled and forced RLS;
3. verify the application role cannot bypass RLS;
4. run two-user cross-owner outfit, wear-record, and deletion smoke tests;
5. verify cascade deletion removes wear events while retaining wardrobe records and media;
6. document backup retention and restoration behaviour for deleted history;
7. verify server and hosting clocks are synchronised for future-date validation;
8. obtain explicit production release approval.

## Decision

Approved for merge into `main` as the implementation-complete outfit-lifecycle and explicit wear-history vertical slice. Production activation remains blocked on the deployment controls above.
