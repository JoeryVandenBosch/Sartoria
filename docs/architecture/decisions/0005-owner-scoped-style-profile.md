# ADR 0005: Owner-scoped style profile with explicit recommendation controls

- Status: Accepted
- Date: 2026-07-25
- Owners: Product, Architecture, Security and Privacy
- Risk level: 3

## Context

Sartoria needs durable user preferences before outfit and recommendation features can be trustworthy. Fit, colour, style direction, brands, climate, materials, and optional measurements influence recommendations, but they remain user-provided preferences rather than inferred truth.

The profile must be private, correctable, exportable, deletable, and usable without AI. It must not become an unbounded prompt document or permit silent inference from wardrobe images.

## Decision

Create one versioned, owner-scoped `style_profile` record per Sartoria account.

- The profile is owned by the Profile module and accessed through an application repository interface.
- PostgreSQL stores a single row per owner with forced row-level security.
- Controlled enums represent fit, climate, recommendation mode, style directions, colours, and excluded materials.
- Brand preferences remain bounded, trimmed user-entered strings because brand names evolve and are not a stable enum.
- Measurements are optional numeric fields stored in metric base units.
- Measurement use is controlled by an explicit `use_measurements_for_recommendations` switch.
- A missing profile is a valid state and yields neutral recommendation constraints.
- User-entered values remain authoritative. AI may suggest changes later but may never silently update the profile.
- Profile updates replace one coherent snapshot and increment a revision number.
- Export returns the current canonical profile as JSON.
- Reset deletes the profile row and returns the account to the missing-profile state.
- Exact location is not required. Climate is a broad user-selected context rather than geolocation.
- Domain and application code do not depend on Next.js, PostgreSQL, analytics, or AI provider SDKs.

## Consequences

### Positive

- Recommendation inputs are explicit and explainable.
- Users can correct, export, or delete all profile data in one place.
- Controlled vocabularies reduce prompt ambiguity and validation complexity.
- Broad climate context provides useful guidance without collecting precise location.
- Optional measurements remain separate from default recommendation behaviour until consent is enabled.

### Costs

- Controlled lists require versioning as product language evolves.
- Snapshot replacement needs concurrency protection to avoid lost updates.
- Brand spelling remains user-controlled and may require later normalization.
- Measurement capture needs careful copy and accessibility review.

## Rejected alternatives

- Inferring a complete style profile from uploaded images: rejected because it is opaque, error-prone, and privacy-invasive.
- Storing free-form profile prose as the source of truth: rejected because it is difficult to validate, compare, export, and safely consume.
- Requiring precise home location for climate: rejected because the product only needs broad wardrobe context.
- Allowing AI to update preferences automatically: rejected because preference truth belongs to the user.

## Validation

- Owner-scoped repository tests must deny cross-user reads and writes.
- Revision checks must reject stale updates.
- Preferred and avoided colours cannot overlap.
- Preferred and avoided brands are normalized and cannot overlap case-insensitively.
- Measurement values must remain within humanly plausible product bounds.
- Export and reset must be owner-scoped and covered by automated tests.
