# ADR 0007 — Revision-Safe Outfit Lifecycle and Private Wear History

Status: accepted  
Date: 2026-07-25  
Decision owners: Architecture, Security, Privacy, Product

## Context

Sartoria can now create and inspect deterministic manual outfits. Users need to correct compositions, remove looks they no longer want, and privately record when an outfit was worn. These capabilities must preserve owner isolation, avoid inferred behaviour, and remain useful without AI.

Wear history is private behavioural data. It can reveal routines, events, or lifestyle patterns, even when the application stores only a date and optional note. The design therefore requires explicit user entry, bounded retention surfaces, correction and deletion controls, and no automatic calendar or location enrichment.

## Decision

### Outfit editing

Reuse the existing outfit domain, application update service, repository revision contract, and owner-scoped wardrobe verification.

The edit workflow:

- loads the outfit by ID and current owner;
- submits the current expected revision;
- verifies all selected wardrobe items again;
- rejects duplicate, missing, cross-owner, or archived selections;
- atomically updates the outfit and membership rows;
- increments the outfit revision;
- returns an explicit conflict when another session changed the outfit.

Existing outfits may continue to display a source wardrobe item that was archived after composition. To save an edited composition, archived items must be removed or restored because new revisions may only reference currently available items.

### Outfit deletion

Expose owner-scoped deletion on the outfit detail page. Deletion requires the current expected revision and explicit user confirmation. PostgreSQL deletes membership rows and wear events through foreign-key cascades. Inaccessible outfit IDs return not-found semantics.

### Wear history

Add an owner-scoped `OutfitWearEvent` domain with:

- generated event ID;
- outfit ID;
- owner ID resolved server-side;
- user-entered calendar date (`YYYY-MM-DD`);
- optional private note of at most 500 characters;
- creation timestamp.

Wear dates cannot be in the future. Dates earlier than 1900-01-01 are rejected. The application never infers a wear event from page views, calendar access, location, media, or recommendations.

Persist wear events through an `OutfitWearEventRepository` interface. Local development uses an in-memory adapter. Production uses an `outfit_wear_events` table with:

- owner-inclusive foreign key to `outfits`;
- enabled and forced row-level security;
- transaction-scoped `app.user_id` enforcement;
- an owner/outfit/date index;
- cascade deletion when the parent outfit is deleted.

### Read model

Outfit collection and detail views may show deterministic aggregates:

- wear count;
- last-worn date;
- chronological wear-event history.

These values are calculated only from explicit wear events. No score, prediction, judgement, or behavioural inference is generated.

### Correction and deletion

Users can delete individual wear events. Event deletion is owner-scoped and idempotent for absence. Editing a wear event is deferred; correction is performed by deleting and recording the corrected event.

## Security and privacy controls

- owner identity is resolved on the server;
- outfit and event IDs are always queried with owner identity;
- expected revisions protect outfit edit and delete operations;
- wear dates and notes are validated server-side;
- notes are excluded from logs, telemetry, metadata, and collection cards;
- no precise time, location, contact, calendar, or automatic tracking is stored;
- RLS is enabled and forced on the wear-event table;
- runtime database roles must not have superuser or `BYPASSRLS` privileges;
- deleting an outfit deletes its private wear events transactionally.

## Consequences

### Positive

- users can correct and retire outfits safely;
- explicit history enables last-worn and wear-count views without AI;
- later planning and insights can rely on durable, user-controlled facts;
- behavioural data remains minimised and explainable;
- stale edits and deletes cannot silently overwrite another session.

### Trade-offs

- users must record wear events manually;
- date-only history cannot distinguish multiple wears on the same day unless multiple events are recorded;
- event editing is delete-and-recreate in this slice;
- archived items must be removed before an outfit revision can be saved;
- backup retention remains an infrastructure concern.

## Rejected alternatives

### Automatic wear detection

Rejected because it would require behavioural inference, calendar or location access, image analysis, or background tracking before user trust and consent foundations exist.

### Store only aggregate counters on the outfit

Rejected because counters are difficult to correct, audit, and delete. Explicit events produce transparent aggregates.

### Allow client-supplied owner IDs

Rejected because ownership must always be derived server-side.

### Silently overwrite stale edits

Rejected because private composition changes must use optimistic concurrency.

## Rollback

Hide edit, delete, and wear-history controls while preserving outfit read routes. The migration is additive. Do not drop tables containing user data; use an approved forward migration or restore process.
