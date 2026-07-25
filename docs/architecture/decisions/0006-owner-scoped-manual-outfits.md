# ADR 0006 — Owner-Scoped Deterministic Manual Outfits

Status: accepted  
Date: 2026-07-25  
Decision owners: Architecture, Security, Privacy, Product

## Context

Sartoria now has reliable owner-scoped wardrobe facts, private media, and user-controlled style preferences. The next product capability is composing those facts into saved outfits without introducing recommendation AI.

An outfit must remain understandable and editable by the user. It may only reference wardrobe items owned by the same authenticated user. The implementation must remain deterministic in local development and production, preserve privacy boundaries, and provide a stable foundation for later explainable recommendations.

## Decision

Implement manual outfits as a dedicated owner-scoped domain module in the modular monolith.

An outfit contains:

- a generated identifier;
- an owner identifier resolved server-side;
- a user-controlled name;
- an optional occasion label;
- an optional private styling note;
- between two and twelve distinct wardrobe item identifiers;
- a monotonically increasing revision;
- created and updated timestamps.

The application layer must verify every referenced wardrobe item through the owner-scoped wardrobe repository before creating or updating an outfit. Cross-owner, missing, duplicate, or archived item references are rejected.

Outfits are persisted through an `OutfitRepository` interface. Local development uses a deterministic in-memory adapter. Production uses PostgreSQL with:

- an `outfits` table;
- an `outfit_items` join table;
- owner identifiers on both tables;
- foreign keys that include owner identity;
- enabled and forced row-level security;
- transaction-scoped `app.user_id` enforcement;
- optimistic revision predicates for changes and deletion.

Core workflows do not depend on AI, external style services, image analysis, or recommendation providers.

## UI decision

Provide:

- `/outfits` for listing and manually creating outfits;
- `/outfits/[outfitId]` for owner-scoped detail;
- wardrobe item selection grouped by category;
- deterministic validation feedback;
- clear links back to source wardrobe items;
- private notes that are never rendered in public metadata.

Only ready owner-authorised media may be used as visual previews. Missing media falls back to the existing restrained item treatment.

## Security and privacy controls

- resolve owner identity only on the server;
- do not accept owner identifiers from forms or JSON;
- verify all referenced item ownership before persistence;
- force PostgreSQL row-level security;
- reject stale writes and deletes;
- cap item count and private note length;
- return not-found semantics for inaccessible outfits;
- avoid precise location, calendar, or contact data in this slice;
- do not expose private styling notes in logs or telemetry.

## Consequences

### Positive

- users can create value before recommendation AI exists;
- later recommendations can reference durable outfit identifiers;
- ownership is enforced at application and database levels;
- outfit behaviour remains testable and provider-neutral;
- saved looks become a future basis for wear history and planning.

### Trade-offs

- initial composition is fully manual;
- category compatibility is not automatically judged;
- wear history and scheduling remain out of scope;
- media previews may be incomplete until an item has ready media.

## Rejected alternatives

### Generate outfits with AI immediately

Rejected because wardrobe accuracy, manual correction, and transparent deterministic behaviour must precede recommendation generation.

### Store item identifiers as a JSON array only

Rejected because relational ownership, foreign-key integrity, queryability, and deletion behaviour are stronger with an owner-scoped join table.

### Trust client-supplied item ownership

Rejected because ownership must be derived and verified server-side.

## Rollback

The change is additive. Disable outfit routes and navigation if application rollback is required. Do not drop tables after user data exists; use an approved export/restore or forward migration.
