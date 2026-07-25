# Manual Outfit Composition Threat Model

Date: 2026-07-25  
Scope: Phase 4 deterministic owner-scoped outfit composition  
Data classification: private wardrobe composition data

## Assets

- outfit names, occasion labels, and private styling notes;
- owner identifiers;
- references to private wardrobe items;
- composition history and revision metadata;
- ready private-media previews already protected by the media boundary.

## Trust boundaries

1. Browser to Next.js server actions and route handlers.
2. Server action to owner-scoped wardrobe and outfit repositories.
3. Application process to PostgreSQL.
4. Outfit page to existing private-media read boundaries.
5. Development in-memory adapters to production PostgreSQL adapters.

## Threats and controls

### Cross-owner item injection

Threat: a client submits wardrobe item identifiers belonging to another user.

Controls:

- resolve the current owner only on the server;
- load every selected item through owner-scoped repository methods;
- reject missing results with generic validation semantics;
- include owner identity in PostgreSQL foreign keys and RLS policies;
- never accept an owner identifier from form or JSON input.

### Cross-owner outfit disclosure

Threat: an authenticated user guesses another outfit identifier.

Controls:

- query outfit details by both outfit ID and current owner;
- return not-found semantics for absent or inaccessible records;
- force PostgreSQL RLS on outfit and join tables;
- do not expose outfit identifiers in public metadata or telemetry.

### Duplicate or malformed composition

Threat: repeated identifiers, oversized collections, empty names, or oversized private notes create inconsistent or abusive records.

Controls:

- transport and domain validation;
- two-to-twelve distinct item limit;
- bounded name, occasion, and note lengths;
- database checks and unique constraints;
- transactionally persist outfit and membership rows.

### Stale overwrite or deletion

Threat: two sessions update or delete the same outfit and silently lose changes.

Controls:

- monotonically increasing revisions;
- expected-revision predicates for update and delete operations;
- explicit conflict errors;
- atomic transactions.

### Archived item use

Threat: a user creates a new outfit using an archived wardrobe item.

Controls:

- application verification rejects archived items;
- UI omits archived items from selectable choices;
- existing outfits retain factual history unless a future product decision defines pruning.

### Private note leakage

Threat: private styling notes appear in logs, analytics, page metadata, error reports, or public previews.

Controls:

- never log form bodies or domain entities;
- keep notes out of metadata and list-card snippets;
- render notes only on the owner-authenticated detail page;
- use privacy-safe error messages.

### Media boundary bypass

Threat: outfit pages directly expose object-store keys or unscanned media.

Controls:

- outfit records store wardrobe item IDs, not media keys;
- previews use the existing owner-authorised ready-media query boundary;
- non-ready and unsupported media fall back to text treatment;
- signed URLs remain short-lived and purpose-limited.

### Database policy bypass

Threat: the runtime database role bypasses RLS or writes join rows for a different owner.

Controls:

- enable and force RLS on both tables;
- set `app.user_id` transaction-locally;
- use owner-inclusive composite keys and foreign keys;
- verify production runtime-role privileges before release;
- prohibit superuser or `BYPASSRLS` runtime credentials.

### Development adapter leakage into production

Threat: production accidentally uses in-memory outfit persistence.

Controls:

- reuse the existing production fail-closed persistence mode;
- require database configuration in production;
- test selector failure behaviour;
- document production migration and verification steps.

## Abuse cases

- submit more than twelve item identifiers;
- submit the same item repeatedly;
- submit archived, missing, or cross-owner item IDs;
- submit HTML or control characters in name, occasion, or notes;
- race two updates with the same revision;
- request another user's outfit ID;
- attempt to infer private-media keys from outfit responses.

## Residual risks

- outfit names and notes are user-generated private text and may contain sensitive personal context;
- database backups may retain deleted outfits according to infrastructure retention policy;
- existing outfit history may reference a wardrobe item later archived or deleted;
- production role and RLS verification remain deployment controls.

## Required verification before merge

- domain and transport validation tests;
- cross-owner item-reference tests;
- owner-scoped list and detail tests;
- stale revision tests;
- PostgreSQL migration review;
- end-to-end create/list/detail flow;
- independent Security and Privacy review.
