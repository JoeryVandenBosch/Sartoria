# Sartoria Delivery Roadmap

## Delivery rule

Complete one reviewable vertical slice at a time. Preserve privacy, owner isolation, accessibility, explainability, deterministic fallbacks, and provider-neutral boundaries. Do not duplicate completed work or introduce public community features into private V1.

## Phase 0 — Engineering foundation

Delivered:

- AIFramework operating contracts and agent entry points;
- Next.js App Router and strict TypeScript scaffold;
- lint, type checking, unit/application tests, Chromium E2E, build, and GitHub Actions;
- modular-monolith architecture, security, privacy, accessibility, and observability foundations;
- ADR, feature-specification, review, handoff, and rollback conventions.

Status: **complete and validated**.

## Phase 1 — Wardrobe and durable identity

Delivered:

- owner-scoped wardrobe and wish-list items;
- category, name, brand, colour, status, fit notes, and optional user-provided acquisition cost;
- list, detail, create, correction, and source-link experiences;
- PostgreSQL repositories, Better Auth current-user boundary, and production fail-closed modes;
- owner-scoped queries and forced PostgreSQL row-level security;
- deterministic development identity and in-memory persistence.

Status: **complete, reviewed, merged, and CI-validated**. Live migration and deployed owner-isolation evidence remain part of Phase 7A.

## Phase 2 — Private media

Delivered:

- owner-scoped upload initiation and lifecycle metadata;
- quarantine-first S3-compatible storage;
- size, metadata, declared-type, binary-type, and ownership verification;
- protected worker dispatch, streaming ClamAV scanning, promotion, and rejection;
- short-lived purpose-limited private access and deletion propagation;
- deterministic development adapters and complete private-media browser flow.

Status: **complete, security-reviewed, merged, and CI-validated**. Live bucket, scanner, CORS, signature, and isolation proof remain part of Phase 7A.

## Phase 3 — Profile and preferences

Delivered:

- fit, colour, style, brand, material, climate, and exclusion preferences;
- optional measurements behind explicit recommendation consent;
- optimistic revisions, owner-scoped export, correction, and reset;
- forced-RLS PostgreSQL persistence and deterministic development persistence.

Status: **complete, reviewed, merged, and CI-validated**.

## Phase 4 — Outfit composition and wear history

Delivered:

- owner-verified manual outfit creation from available wardrobe items;
- private occasion and styling context;
- revision-safe editing, confirmed deletion, and intentional archive behaviour;
- explicit date-only, non-future private wear events;
- factual wear count, last-worn views, correction, and cascade deletion;
- owner-inclusive relational integrity and forced RLS.

Status: **complete, reviewed, merged, and CI-validated**.

## Phase 5 — Explainable recommendations

Delivered:

- explicit private recommendation requests;
- provider-neutral gateway with versioned structured outputs;
- owner-scoped minimal context and measurement-consent enforcement;
- source-item references, concise explanation, exclusions, confidence, and provenance;
- strict schema, availability, owner, duplicate, confidence, size, timeout, and HTTPS validation;
- deterministic saved-outfit and wardrobe-first fallback;
- correction, rejection, expiry, deletion, and private history;
- forced-RLS persistence and no storage of hidden reasoning.

Status: **complete, reviewed, merged, and CI-validated**. Provider mode remains disabled until separate privacy, security, egress, retention, and vendor approval is recorded.

## Phase 6A — Deterministic travel planning and packing

Delivered:

- date-only private travel plans with bounded optional destination labels;
- expected climate, activities, and laundry controls;
- deterministic category targets and wardrobe-grounded preview;
- user-controlled final selection and honest coverage warnings;
- owner-inclusive membership integrity, forced RLS, list/detail history, and revision-safe deletion;
- no booking, coordinate, companion, calendar, live-weather, or AI dependency.

Status: **complete, reviewed, merged, and CI-validated**.

## Phase 6B — Factual wardrobe insights

Delivered:

- broad category coverage and explainable gaps;
- exact and broader duplicate signals;
- current-membership wear attribution, wear frequency, and underuse;
- optional cost-per-wear only from user-provided acquisition facts;
- deterministic wish-list purchase-impact analysis;
- source facts, correction links, methodology, and deterministic ordering.

Status: **complete, reviewed, merged, and CI-validated**.

## Phase 7A — Private staging deployment and acceptance

Repository-delivered:

- fail-closed production environment verifier;
- immutable standalone non-root application image;
- HTTPS Caddy edge, PostgreSQL, private MinIO, ClamAV, bucket bootstrap, and migration jobs;
- liveness and database-readiness endpoints;
- exact migration, smoke, rollback, stop-condition, and evidence runbooks;
- live staging verifier for HTTPS headers, health, bootstrap state, and anonymous bucket denial;
- staging-only, one-time, bearer-protected Better Auth bootstrap for an owner and isolation-test user;
- transactional pending/completed audit state without passwords or tokens;
- public sign-up remains disabled.

External acceptance tracked by issue `#17`:

- choose host and region;
- configure DNS, TLS, ingress restrictions, digest-pinned images, secret storage, and off-host backups;
- run migrations and bootstrap both identities;
- prove every private workflow and cross-owner denial;
- prove restart persistence and database/object-storage restoration;
- retain the required evidence and name the staging operator and incident contact.

Status: **repository package complete and CI-validated; live staging not yet accepted**.

## Phase 7B — Closed-beta readiness

This is the next repository-owned coding phase when external staging inputs are unavailable.

Planned vertical slices, in order:

1. **Operational observability** — structured privacy-safe application events, health metrics, scanner and queue signals, deployment identifiers, alert thresholds, and a documented provider-neutral sink.
2. **Bounded rate limiting** — owner, IP, and internal-endpoint protections with deterministic local adapters, explicit failure behaviour, tests, and operator controls.
3. **Invitation-controlled onboarding** — private account invitations and lifecycle without enabling public sign-up; expiry, single use, audit, revocation, and owner isolation are mandatory.
4. **Backup automation interfaces** — provider-neutral scheduled backup, verification, retention, restore-rehearsal evidence, and failure alerts; never claim backup success without provider evidence.
5. **Privacy and retention controls** — approved retention schedule, account deletion workflow completion, private-media deletion verification, support process, privacy notice, and terms.
6. **Closed-beta release gate** — complete staging evidence, named operators, incident contacts, support process, deployment rehearsal, security review, and explicit human release approval.

Exit criteria:

- each slice has acceptance criteria, tests, operations guidance, rollback, and review evidence;
- no public sign-up, community, discovery, or public wardrobe sharing enters V1;
- lint, strict types, unit/application tests, build, Chromium E2E, and deployment contract checks are green;
- live staging issue `#17` is complete before closed-beta acceptance.

Status: **not started; approved next repository-owned phase**.

## Phase 8 — Product refinement after closed beta

Candidate work after Phase 7B evidence:

- mobile-first wardrobe capture and editing refinement;
- faster outfit composition and comparison;
- richer deterministic styling rules and preference correction;
- optional approved weather enrichment that cannot block packing;
- internationalisation preparation;
- accessibility and performance refinements from real beta evidence.

Status: **backlog; prioritise from observed private-beta needs**.

## Explicitly outside private V1

- public community profiles;
- social feeds, follows, likes, or public comments;
- public wardrobe or outfit discovery;
- marketplace, affiliate, or advertising features;
- silent background tracking of wear, location, calendar, purchases, or travel;
- unreviewed AI providers or autonomous changes to user-owned facts.