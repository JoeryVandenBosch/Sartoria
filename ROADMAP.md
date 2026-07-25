# Sartoria Delivery Roadmap

## Phase 0 — Engineering foundation

Exit criteria:

- AIFramework operating contracts are present and enforced;
- Next.js and TypeScript scaffold builds in strict mode;
- linting, type checking, unit tests, and CI are active;
- architecture, security, privacy, accessibility, and observability foundations are documented;
- the first vertical slice has acceptance criteria and an ADR-backed implementation plan.

Status: complete.

## Phase 1 — Wardrobe item foundation

Deliver the first complete vertical slice: add and view a wardrobe item.

Scope:

- wardrobe item domain model;
- authenticated ownership boundary or an explicit development identity adapter;
- category, name, brand, colour, ownership status, and optional fit notes;
- create-item use case;
- wardrobe list and item detail;
- transport validation;
- deterministic behaviour without AI;
- unit, integration, and accessibility tests;
- privacy-safe observability.

Status: complete and validated in CI.

## Phase 1.5 — Production identity and persistence

- PostgreSQL connection and migration foundation;
- durable wardrobe repository adapter;
- Better Auth server integration;
- provider-neutral current-user boundary;
- owner-scoped queries and PostgreSQL row-level security;
- production fail-closed configuration;
- deployment, rollback, and operational guidance.

Exit criteria:

- local development remains deterministic without external infrastructure;
- production cannot use development identity or in-memory persistence;
- lint, type checking, tests, build, and end-to-end checks are green;
- independent security and privacy review is recorded.

Status: implementation complete and security-reviewed; managed infrastructure provisioning and production release approval remain pending.

## Phase 2 — Private media

- secure image upload initiation;
- media ownership and lifecycle metadata;
- type and size validation;
- malware-scanning boundary;
- short-lived purpose-limited access;
- deletion propagation.

Exit criteria:

- uploads enter a non-readable quarantine prefix;
- storage metadata, content length, declared type, and owner are verified;
- binary type detection and malware scanning gate promotion;
- only ready media receive owner-authorised short-lived URLs;
- deletion removes all object variants and records terminal state;
- local development and CI use deterministic adapters;
- lint, strict types, tests, production build, and private-media E2E are green;
- independent Security and Privacy review is recorded.

Status: implementation complete, security-reviewed, and validated in CI; production storage, queue, scanner, infrastructure verification, and release approval remain pending.

## Phase 3 — Profile and preferences

- fit, colour, style, brand, climate, and exclusion preferences;
- user-controlled corrections;
- privacy controls and data export foundations.

Exit criteria:

- all profile reads, writes, exports, and resets are owner-scoped;
- PostgreSQL row-level security is enabled and forced;
- stale writes and resets fail through optimistic revision checks;
- measurements are optional and excluded from recommendation data without explicit consent;
- preferred and avoided signals cannot conflict;
- the user can save, revise, export, and reset the profile;
- local development remains deterministic without external infrastructure;
- lint, strict types, unit/application tests, production build, and profile E2E are green;
- independent Security and Privacy review is recorded.

Status: implementation complete, security-reviewed, and validated in CI; production migration execution and release approval remain pending.

## Phase 4 — Outfit composition

### Phase 4A — Deterministic manual outfits

- manual outfit creation from two to twelve owned wardrobe items;
- optional occasion and private styling notes;
- owner-scoped list and detail experiences;
- relational membership integrity and optimistic revisions;
- no AI dependency for core workflows.

Exit criteria:

- every selected wardrobe item is verified server-side for ownership and availability;
- duplicate, missing, archived, and cross-owner references are rejected;
- PostgreSQL outfit and membership tables use owner-inclusive foreign keys;
- row-level security is enabled and forced on both tables;
- local development uses deterministic in-memory persistence;
- lint, strict types, 54 unit/application tests, production build, and outfit E2E are green;
- independent Security and Privacy review is recorded.

Status: implementation complete, security-reviewed, merged, and validated in CI; production migration execution and release approval remain pending.

### Phase 4B — Outfit lifecycle and wear history

- revision-safe outfit editing and deletion;
- intentional source-item archive behaviour;
- explicit date-only wear-event recording;
- factual last-worn and wear-count views;
- privacy-safe history correction and cascade deletion.

Exit criteria:

- edit and delete operations are owner-scoped and revision-protected;
- edited compositions revalidate all wardrobe memberships;
- archived items remain factual on existing views but cannot enter a new revision;
- wear events are explicit, date-only, non-future, and owner-scoped;
- no calendar, location, precise time, or automatic tracking is collected;
- users can remove individual events and delete the outfit with its history;
- PostgreSQL wear history uses an owner-inclusive cascade foreign key and forced RLS;
- local development remains deterministic without external infrastructure;
- lint, strict types, 65 unit/application tests, production build, and lifecycle E2E are green;
- independent Security and Privacy review is recorded.

Status: implementation complete, security-reviewed, merged, and validated in CI; production migration execution and release approval remain pending.

## Phase 5 — Explainable recommendations

- provider-neutral recommendation gateway;
- versioned, structured, and schema-validated outputs;
- owner-scoped minimal context with measurement-consent enforcement;
- source-item references, reasoning, exclusions, confidence, and provenance;
- deterministic saved-outfit and wardrobe-first fallback;
- correction, rejection, expiry, deletion, and private history;
- bounded HTTPS transport and fail-closed provider configuration.

Exit criteria:

- every request is explicitly initiated and owner identity is resolved server-side;
- provider context excludes account identity, credentials, private notes, media data, and unrelated history;
- measurements are included only with explicit recommendation consent;
- every returned item identifier is verified against the supplied owner-scoped available set;
- malformed, duplicate, unknown, low-confidence, failed, and timed-out provider results activate fallback;
- provider requests and responses are capped at 64 KiB and production endpoints require HTTPS;
- PostgreSQL recommendation persistence enables and forces RLS;
- users can inspect provenance and confidence, correct, reject, and delete results;
- raw hidden reasoning is never stored;
- local development remains deterministic without external infrastructure;
- lint, strict types, 75 unit/application tests, production build, and 6 browser flows are green;
- Architecture, Security, Privacy, and Product review is recorded.

Status: implementation complete, reviewed, merged, and validated in CI; provider approval, production migration, egress controls, secret management, deployed isolation tests, retention approval, and release approval remain pending.

## Phase 6 — Planning and insights

### Phase 6A — Deterministic travel planning and packing

- date-only owner-scoped travel plans;
- optional broad destination labels;
- manual climate expectation, activity contexts, and laundry access;
- deterministic category targets and wardrobe-grounded packing preview;
- user-controlled final item selection;
- coverage warnings without fabricated items;
- private list, detail, and revision-safe deletion;
- no weather, calendar, precise-location, booking, or AI dependency.

Exit criteria:

- every plan is explicitly created and owner identity is resolved server-side;
- dates are valid, date-only, ordered, and limited to sixty days;
- destination, notes, activities, warnings, and packing membership are bounded;
- preview uses only current-owner items with status `owned`;
- final selection is reverified for owner and availability before persistence;
- the same inputs and wardrobe state produce the same ordered suggestion;
- missing category coverage produces text warnings and never fabricated items;
- PostgreSQL plan and membership tables use owner-inclusive foreign keys and forced RLS;
- local development remains deterministic without external infrastructure;
- lint, strict types, domain/application tests, production build, and complete browser flow are green;
- Architecture, Security, Privacy, and Product review is recorded.

Status: implementation complete, reviewed, and validated in CI; production migration, deployed isolation, logging, performance, retention, backup, restore, and release approval remain pending.

### Phase 6B — Factual wardrobe insights

- duplication and near-duplication indicators;
- underuse and wear-frequency summaries;
- category coverage and explainable gaps;
- cost-per-wear where user-provided cost data exists;
- purchase-impact analysis before adding a wish-list item;
- deterministic calculations with source facts and correction paths.

Status: not started.

## Delivery rule

Complete one reviewable vertical slice at a time. External providers must remain optional, bounded, explainable, and unable to compromise deterministic core workflows.
