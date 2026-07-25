# Travel Planning Architecture, Security, Privacy, and Product Review

Date: 2026-07-25  
Scope: Phase 6A deterministic private travel planning and packing lists  
Review mode: role-separated repository review under AIFramework  
Change risk: 2 — private date-only travel context and wardrobe membership

## Reviewed surfaces

- `src/modules/planning/domain/`
- `src/modules/planning/application/`
- `src/modules/planning/transport/`
- `src/modules/planning/infrastructure/`
- `src/app/api/planning/`
- `src/app/planning/`
- `src/app/planning.css`
- `migrations/0007_travel_plans.sql`
- planning domain, packing-rule, ownership, persistence, and browser tests
- ADR 0009, Feature 008, and travel-planning threat model

## Architecture review

### Deterministic planning

Status: accepted.

Packing targets and item selection are deterministic functions of date-only duration, climate expectation, activities, laundry access, owned wardrobe state, and user-controlled preference signals. No weather, calendar, location, or AI provider is required.

### Domain boundaries

Status: accepted.

Travel plans have a dedicated domain and repository contract. Wardrobe facts and style-profile signals are read through existing owner-scoped interfaces. External climate enrichment is explicitly deferred behind a future provider-neutral boundary.

### Persistence integrity

Status: accepted with deployment verification.

PostgreSQL uses parent and membership tables with owner identity on both. Membership foreign keys include owner identity, writes are transactional, and both tables force RLS. The runtime role and migration execution remain production gates.

## Security review

### Owner isolation

Status: accepted.

Owner identity is server-resolved. Preview and final save use owner-scoped repositories. Client item identifiers are reverified. Only `owned` items pass. List, detail, and deletion remain owner-scoped, with revision-safe deletion.

### Input bounds

Status: accepted.

Trip duration, dates, destination, notes, activities, packing-list membership, target sizes, and warnings are bounded. Date parsing verifies exact calendar round trips and limits plans to sixty days.

### Relational integrity

Status: accepted.

The database enforces owner-inclusive plan and wardrobe references, unique item membership, unique position, item-count position bounds, date ordering, duration, and enumerated control values.

## Privacy review

### Data minimisation

Status: accepted.

The domain stores broad destination text, date-only range, climate expectation, activities, laundry access, optional notes, and item membership. It contains no coordinates, addresses, travel times, bookings, reservations, contacts, companions, or calendar credentials.

### External processing

Status: accepted.

The initial slice performs no external request. Manual climate expectation remains the source of truth. This review does not approve future weather, location, calendar, or AI enrichment.

### Transparency and control

Status: accepted.

The user explicitly builds a preview, receives text category targets and coverage warnings, controls the final checkboxes, inspects saved facts, and can delete the plan.

## Product review

### User outcome

Status: accepted.

The flow creates immediate value from the owned wardrobe: broad trip inputs produce a clear packing starting point, unavailable coverage is surfaced honestly, and the user remains in control of the final selection.

### Product restraint

Status: accepted.

The implementation does not fabricate items, force shopping, infer travel, connect calendars, track location, or require provider availability. Existing archived items may remain factual on a saved plan but cannot be newly saved.

### Accessibility

Status: accepted.

Inputs have labels, activity and item selection use native checkboxes, messages and warnings are textual, controls are keyboard operable, and focus styling is inherited from the application foundation.

## Validation evidence

Successful GitHub Actions run: `30174857938`.

- ESLint: passed;
- strict TypeScript: passed;
- unit and application tests: passed;
- production build: passed;
- Chromium installation: passed;
- end-to-end browser tests: passed;
- travel flow covers wardrobe setup, preview, manual adjustment, save, detail, list return, reopen, confirmation, and deletion.

## Findings and disposition

1. **External climate dependency risk** — avoided; no external gateway is present.
2. **Cross-owner final-selection tampering** — controlled through server-side item revalidation and owner-inclusive foreign keys.
3. **Sensitive free-text risk** — bounded and excluded from list metadata and operational logging policy.
4. **Large-wardrobe performance** — production-like performance verification remains a release gate.
5. **Automatic source-item changes** — saved plans remain factual; unavailable items are shown as unavailable rather than silently replaced.

## Decision

Approved for merge into `main` as an implementation-complete Phase 6A slice after the final documentation-state CI run is green.

Not approved for production release until migration, runtime role, RLS, cross-user isolation, logging, retention, backup, restore, performance, and explicit release gates are complete.
