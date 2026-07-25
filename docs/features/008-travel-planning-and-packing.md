# Feature 008 — Travel Planning and Packing Lists

Status: implementation complete, reviewed, and validated in CI  
Risk: 2 — private owner-scoped date, destination-label, activity, and wardrobe-selection data

## User outcome

A signed-in user can create a private trip plan, receive a deterministic packing suggestion grounded in owned wardrobe items, adjust the selection, save it, and inspect the final packing list without requiring weather, calendar, location, or AI access.

## In scope

- private trip name and optional broad destination label;
- date-only start and end dates;
- manually selected climate expectation;
- activity contexts and laundry access;
- optional private trip notes;
- deterministic category targets and packing suggestion;
- user-controlled final wardrobe-item selection;
- owner-scoped list and detail views;
- coverage warnings when the wardrobe cannot meet a target;
- PostgreSQL persistence with forced RLS;
- deterministic in-memory development persistence;
- optimistic revision foundations;
- accessible responsive planning UI.

## Out of scope

- precise location or coordinates;
- live weather or forecast calls;
- calendar, email, booking, reservation, route, or contact access;
- companion profiles;
- automatic purchase suggestions;
- AI-generated packing lists;
- background plan creation;
- public sharing;
- luggage-weight estimation;
- automatic outfit scheduling.

## Acceptance criteria

### Plan inputs

1. The user explicitly creates every plan.
2. Trip name is required and limited to 120 characters.
3. Destination is optional, broad text limited to 120 characters, and must not require coordinates.
4. Start and end dates use `YYYY-MM-DD` and the end cannot precede the start.
5. Trip duration is between one and 60 days.
6. Climate expectation is one of cold, cool, mild, warm, hot, or mixed.
7. At least one and at most six activity contexts may be selected.
8. Laundry access is none, limited, or regular.
9. Private notes are optional and limited to 1,000 characters.

### Deterministic suggestion

1. Suggestion uses only current-user wardrobe items with status `owned`.
2. Archived, wish-list, missing, duplicate, and cross-owner references are excluded.
3. The same inputs and wardrobe state produce the same ordered suggestion.
4. Category targets derive from trip length, climate, activity, and laundry access.
5. Suggested list contains between two and 40 distinct items when sufficient wardrobe data exists.
6. Each suggested item includes a concise deterministic selection reason.
7. Missing category coverage produces a text warning and does not fabricate an item.
8. No provider, network, calendar, or location access is required.

### User control and save

1. The user can review suggested items as native checkboxes.
2. The user may remove suggested items or add other owned items before save.
3. The final list must contain between two and 60 distinct owned items.
4. Every submitted item identifier is reverified server-side.
5. Owner identity cannot be supplied by the client.
6. Successful save opens the private plan detail page.

### List and detail

1. `/planning` lists only the current user's plans, newest updated first.
2. Each plan card shows name, broad destination when present, date range, duration, and item count.
3. `/planning/[planId]` returns not found for absent or inaccessible plans.
4. Detail shows climate, activities, laundry access, warnings, private notes, and every selected wardrobe item.
5. Each item links to the owner-scoped wardrobe detail page.
6. Travel data is excluded from public metadata.

### Persistence and integrity

1. PostgreSQL uses `travel_plans` and `travel_plan_items` tables.
2. Both tables include owner identity.
3. Membership foreign keys include owner identity.
4. Row-level security is enabled and forced on both tables.
5. Writes are atomic and revision-aware.
6. Local development uses deterministic in-memory persistence.

### Privacy and security

1. No coordinates, booking references, travel times, calendar tokens, or companion identities are collected.
2. Private trip notes are not written to logs or diagnostics.
3. Inaccessible plans use not-found semantics.
4. Inputs and item counts are bounded.
5. Delete support removes plan membership with the parent record.

### Accessibility

1. Every control has a programmatic label.
2. Activity and wardrobe selection uses native checkboxes.
3. Validation and coverage warnings use text and live-region semantics.
4. The complete workflow is keyboard operable.
5. Focus remains visible.

### Validation gate

- ESLint passes;
- strict TypeScript passes;
- domain, date, packing-rule, ownership, persistence, and transport tests pass;
- production build passes;
- Chromium end-to-end preview, adjust, save, detail, list, reopen, and delete flow passes;
- Architecture, Security, Privacy, and Product review is recorded.

## Production release gates

- approved migration applied;
- runtime role and forced RLS verified;
- deployed two-user isolation tests passed;
- invalid, stale, archived, wish-list, duplicate, missing, and cross-owner submissions tested;
- private-field log and metadata redaction verified;
- production-like wardrobe performance approved;
- retention, deletion, backup, restore, and source-item behaviour approved;
- explicit Architecture, Security, Privacy, and Product release approval recorded.

## Rollback

Hide Planning navigation and disable travel-plan route surfaces. Preserve user records and database tables once production data exists. Use an approved forward migration, export, or restore process.
