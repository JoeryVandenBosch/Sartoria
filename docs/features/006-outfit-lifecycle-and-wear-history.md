# Feature 006 — Outfit Lifecycle and Private Wear History

Status: implementation ready  
Risk: 3 — user-controlled behavioural history and destructive private-data operations

## User outcome

A signed-in user can correct an outfit, delete it intentionally, record when it was worn, see factual wear count and last-worn information, and remove incorrect wear records without AI or background tracking.

## In scope

- edit outfit name, occasion, private note, and wardrobe composition;
- optimistic revision conflict handling;
- user-confirmed outfit deletion;
- record a private date-only wear event;
- optional private wear note;
- show wear count and last-worn date;
- list wear events newest first;
- delete individual wear events;
- deterministic development persistence;
- PostgreSQL persistence with forced RLS;
- owner-scoped cascade deletion;
- responsive and accessible controls;
- privacy-safe validation and diagnostics.

## Out of scope

- automatic wear detection;
- calendar, contact, or location integrations;
- precise time or venue storage;
- AI-generated wear suggestions;
- event editing beyond delete-and-recreate;
- public activity feeds;
- social sharing;
- cost-per-wear calculations;
- packing and travel planning.

## Acceptance criteria

### Edit outfit

1. The owner can open an edit control from the outfit detail page.
2. Existing values and selected wardrobe items are pre-populated.
3. The server resolves owner identity and ignores client ownership claims.
4. The submitted expected revision must match the current outfit revision.
5. The updated composition contains two to twelve distinct, currently available owner-scoped wardrobe items.
6. Archived items may remain visible in the existing detail but must be removed before saving a new revision.
7. A successful update increments the revision and returns to the outfit detail.
8. A stale update returns a clear conflict without overwriting newer data.

### Delete outfit

1. Deletion is available only on the owner-authenticated detail page.
2. The user must explicitly confirm deletion.
3. The expected revision must match the current revision.
4. Deletion removes the outfit, membership rows, and all wear events.
5. A successful deletion returns to `/outfits`.
6. Cross-owner or absent outfit IDs do not reveal existence.

### Record wear event

1. The owner can enter a date from 1900-01-01 through today.
2. The date is stored as a calendar date without time-zone conversion.
3. An optional private note is limited to 500 characters.
4. Owner and outfit identity are resolved and verified server-side.
5. Multiple wears on the same date are allowed because they are explicit events.
6. A successful record updates wear count and last-worn data.
7. No event is inferred or created automatically.

### View history

1. The outfit detail shows wear count.
2. Last worn is the maximum explicit wear date or “Not recorded” when empty.
3. Events appear newest first, with deterministic created-time tie-breaking.
4. Private wear notes appear only within the owner's authenticated detail page.
5. Collection cards may show count and last-worn date but never wear notes.

### Correct history

1. The owner can delete an individual wear event.
2. Deletion is owner-scoped and returns not-found semantics for inaccessible IDs.
3. Removing an event recalculates count and last-worn data.
4. Deleting the parent outfit cascades to all wear events.

### Persistence and privacy

1. PostgreSQL `outfit_wear_events` includes owner identity.
2. The table enables and forces RLS.
3. The foreign key to outfits includes owner identity and cascades on delete.
4. Local development remains deterministic without external infrastructure.
5. Notes never appear in metadata, logs, analytics, or collection cards.
6. No location, precise time, calendar identifier, or inferred behaviour is stored.

### Accessibility

1. Edit, delete, record, and event-delete controls are keyboard operable.
2. Every field has a programmatic label.
3. Destructive actions require explicit confirmation.
4. Errors and success states use appropriate live or alert semantics.
5. Focus remains visible and returns to a meaningful location after updates.

### Validation gate

- ESLint passes;
- strict TypeScript passes;
- outfit update/delete tests pass;
- wear-event domain, repository, transport, aggregate, ownership, and deletion tests pass;
- production build passes;
- Chromium end-to-end edit, wear-record, event-delete, and outfit-delete flow passes;
- independent Security and Privacy review is recorded before merge.

## Rollback

Hide lifecycle and wear-history controls. Preserve outfit read-only pages and existing records. Do not drop the wear-event table after production data exists; use an approved forward migration or restore process.
