# Travel Planning and Packing Threat Model

Date: 2026-07-25  
Scope: Phase 6A private date-only travel plans and deterministic packing lists  
Risk: 2 — private owner-scoped travel context and wardrobe membership

## Assets

- authenticated owner identity;
- broad destination label;
- date-only trip range;
- expected climate, activities, and laundry access;
- private trip notes;
- owner-scoped wardrobe facts;
- deterministic packing targets, warnings, and final item membership;
- PostgreSQL owner context and revision state.

## Trust boundaries

1. Browser to packing-preview endpoint.
2. Browser to travel-plan creation and deletion endpoints.
3. Application to owner-scoped wardrobe, profile, and travel-plan repositories.
4. Application to PostgreSQL under transaction-local `app.user_id`.
5. Stored plan to owner-scoped list and detail UI.

## Data flow

1. The user explicitly enters broad trip inputs.
2. The server resolves owner identity.
3. The preview endpoint loads only the owner's `owned` wardrobe items and style-profile preference signals.
4. A deterministic algorithm creates category targets, item reasons, and coverage warnings.
5. The user adjusts native item checkboxes.
6. The server reverifies every selected wardrobe identifier for ownership and availability.
7. The plan and ordered membership are stored atomically.
8. The owner can inspect and revision-safely delete the plan.

## Threats and controls

### Cross-owner wardrobe or plan access

Threat: another user's wardrobe items enter a packing list, or another user's plan can be read or deleted.

Controls:

- owner identity resolved server-side;
- owner identifiers absent from request schemas;
- wardrobe preview and save use owner-scoped repositories;
- every submitted item identifier is reloaded for the owner;
- PostgreSQL membership foreign keys include owner identity;
- both tables enable and force RLS;
- list, detail, and delete are owner-scoped;
- inaccessible records use not-found semantics.

Residual risk: production runtime role and transaction-local owner settings require deployed verification.

### Excessive travel-detail collection

Threat: precise location, itinerary, booking, companion, or calendar data is collected unnecessarily.

Controls:

- destination is optional broad text limited to 120 characters;
- dates are date-only;
- no coordinates, addresses, booking references, flight numbers, times, contacts, or calendar tokens exist in the domain;
- notes are optional and capped at 1,000 characters;
- UI explicitly discourages sensitive detail.

Residual risk: users may voluntarily enter sensitive content into free text; operational logs must not capture it.

### Packing-list tampering

Threat: a client adds duplicate, archived, wish-list, missing, or cross-owner identifiers after preview.

Controls:

- final selection is bounded to 2–60 unique identifiers;
- transport and domain reject duplicates;
- application reloads each identifier through `findByIdForOwner`;
- only `owned` status is accepted;
- PostgreSQL owner-inclusive foreign keys enforce relational integrity.

Residual risk: an item archived after plan creation remains factual in an existing plan and may appear unavailable on detail, which is intentional.

### Date manipulation and denial of service

Threat: invalid dates, huge trip windows, or oversized packing targets cause excessive work.

Controls:

- strict `YYYY-MM-DD` validation;
- calendar-date round-trip validation;
- one-to-sixty-day duration limit;
- six activity maximum;
- deterministic target caps;
- 40-item suggestion cap and 60-item saved-list cap;
- 12-warning cap.

Residual risk: large wardrobes are loaded for preview; pagination or indexed category queries may be needed at production scale.

### Hidden external data transfer

Threat: travel data is sent to a weather, calendar, AI, or location provider without explicit approval.

Controls:

- initial implementation contains no external gateway;
- deterministic preview runs entirely inside Sartoria;
- ADR requires any future climate enrichment to be provider-neutral, optional, and separately reviewed;
- manual climate expectation remains authoritative.

Residual risk: future enrichment must not reuse this approval.

### Private-note disclosure

Threat: private trip notes appear in metadata, logs, diagnostics, list cards, or provider context.

Controls:

- notes appear only on the owner-scoped detail page;
- metadata uses a generic product description;
- list cards exclude notes;
- no provider integration exists;
- runbook prohibits logging request bodies or notes.

Residual risk: hosting-platform error capture must be verified before production release.

### Stale deletion

Threat: a deletion removes a plan changed in another session.

Controls:

- client submits expected revision;
- repository deletes with owner and revision predicates;
- revision mismatch returns conflict;
- membership cascades only after the parent delete succeeds.

Residual risk: browser confirmation is not a substitute for backups and recovery policy.

## Abuse cases

- submit `ownerId` in JSON: ignored because schemas do not accept it;
- submit another user's item identifier: revalidation fails with generic unavailable semantics;
- submit wish-list or archived item: save is rejected;
- submit duplicated item IDs: transport/domain validation rejects them;
- submit a 61-day plan: date validation rejects it;
- submit coordinates in a dedicated field: no such field exists;
- bypass preview and call create directly: final ownership, dates, limits, and membership are still validated;
- delete another user's plan: owner-scoped repository returns not found.

## Required production verification

- apply `0007_travel_plans.sql` through the approved migration path;
- verify runtime role lacks superuser and `BYPASSRLS` privileges;
- verify RLS is enabled and forced on both tables;
- run two-user preview, create, list, detail, and delete isolation tests;
- test cross-owner, archived, wish-list, duplicate, stale-revision, and oversized submissions;
- prove request bodies and private notes are absent from logs and diagnostics;
- approve retention, backup, restore, and deletion expectations;
- review performance with production-like wardrobe sizes;
- record explicit Architecture, Security, Privacy, and Product release approval.
