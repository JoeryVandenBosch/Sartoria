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

Status: implementation complete and validated in CI; review evidence, production migration execution, and release approval remain pending before merge.

## Phase 5 — Explainable recommendations

- provider-neutral AI gateway;
- structured and schema-validated outputs;
- source item references, reasoning, exclusions, confidence, correction, rejection, and fallback.

## Phase 6 — Planning and insights

- occasion and travel planning;
- packing lists and climate context;
- duplication, underuse, coverage, gaps, cost-per-wear, and purchase-impact insights.

## Delivery rule

Complete one reviewable vertical slice at a time. Do not introduce recommendation AI before wardrobe facts, ownership, privacy, and deterministic workflows are reliable.
