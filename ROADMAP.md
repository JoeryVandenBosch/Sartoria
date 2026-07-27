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

### Prerequisite — wardrobe item correction and lifecycle

Identified during Phase 8A implementation and raised here rather than in Phase 8 because it is a functional gap, not refinement.

Wardrobe items are **create-only**. There is no update and no delete: the domain exposes `createWardrobeItem` and nothing else, and the application layer holds only creation and queries. Every other entity in the product is correctable — outfits support update, delete, and delete-with-history; wear events support correction and deletion; recommendations support correction, rejection, and deletion. The wardrobe item, which every one of those references, is the single exception.

Three consequences make this a closed-beta prerequisite rather than a later improvement:

1. **The wish-list lifecycle cannot complete.** An item recorded as wish-list can never be marked owned. Buying something you planned to buy is a core product loop, and it currently has no ending.
2. **Mistakes are permanent.** A mistyped name, wrong colour, or wrong acquisition cost cannot be corrected. Cost feeds cost-per-wear, so a single typo permanently distorts the insights the product exists to provide.
3. **README already promises this.** It advertises revision-safe editing and correction of user-owned facts. That promise holds everywhere except the foundational entity.

A closed beta invites real people to enter real wardrobes. They will make mistakes on the first evening, and they will buy something from their wish list in the first month. Neither is currently recoverable.

Scope when implemented:

- edit an item's name, brand, category, colour, fit notes, and acquisition cost, honouring the existing domain rule that cost belongs only to owned items;
- change ownership status, including the wish-list to owned transition, with the acquisition cost that transition implies;
- archive and restore an item without deleting its history;
- delete an item, with explicit handling of outfits and wear history that reference it, following the precedent already set by `delete-outfit-with-history`;
- owner isolation and an audit trail consistent with the rest of the product.

Sequencing: **before closed-beta acceptance, after the six slices above or in parallel with them.** It does not block any of those slices and none of them block it.

Exit criteria:

- each slice has acceptance criteria, tests, operations guidance, rollback, and review evidence;
- no public sign-up, community, discovery, or public wardrobe sharing enters V1;
- lint, strict types, unit/application tests, build, Chromium E2E, and deployment contract checks are green;
- live staging issue `#17` is complete before closed-beta acceptance.

Status: **in progress. Slices 1 and 2 implemented and awaiting independent review; slice 3 specified. Wardrobe item correction identified as an additional prerequisite.**

## Phase 8 — Product refinement after closed beta

### 8A — Wardrobe browsing

The first Phase 8 slice, specified ahead of time because the ordering decision inside it is architectural rather than cosmetic.

Ordered by value, not by request order:

1. **Ownership status filter** — owned, wish-list, archived. Ranked first because it corrects a conceptual muddle rather than a scale problem: the list currently mixes items the person owns with items they are only considering, although the domain already treats those differently. Wish-list items cannot be packed or worn, and archived items are out of rotation. The interface should not hide a distinction the model takes seriously.
2. **Category filter** — shirts, trousers, tailoring, outerwear, and the remaining declared categories. Necessary beyond roughly thirty items.
3. **Tile and list view toggle** — tiles for visual recognition once private imagery is attached, list for scanning brand, category, and cost. Tile view carries little information until items have images, so this slice follows image attachment rather than preceding it.
4. **Filter and view state held in the URL**, for example `/wardrobe?view=list&status=owned&category=shirts`. This is the decision that is expensive to reverse. The wardrobe page is a server component; URL state keeps it one, survives refresh, is bookmarkable, works without client JavaScript, and avoids hydration mismatch. Client-held state would push the listing towards client-side fetching, which is a materially larger change than it appears.
5. **Filter options derived from the items actually present, with counts.** Offering every declared category regardless of contents is noise; a category the person owns nothing in should not be offered.
6. **Search by item name.** The cheapest useful addition beyond roughly one hundred items. Deferred until browsing exists.
7. **Sort by recently added, name, or acquisition cost.** Useful, not urgent.

Explicitly excluded from this slice:

- faceted counts that recalculate as filters are applied. The complexity is real and the benefit at private-wardrobe scale is not;
- saved or shareable filter presets;
- bulk selection and bulk editing.

Status: **specified; not started. Begins after Phase 7B.**

### 8B — Remaining refinement candidates

- mobile-first wardrobe capture and editing refinement;
- faster outfit composition and comparison;
- richer deterministic styling rules and preference correction;
- optional approved weather enrichment that cannot block packing;
- internationalisation preparation;
- accessibility and performance refinements from real beta evidence.

Status: **backlog; prioritise from observed private-beta needs**.

## Work completed ahead of its phase

Recorded so the sequence remains honest rather than implied:

- **wardrobe image attachment at creation time** (#25) — Phase 8 usability work brought forward because the media pipeline already existed and the four-step create, find, open, upload sequence was a barrier to evaluating the product;
- **development-only synthetic wardrobe seed** (#24) — not product scope; exists so the application can be evaluated in a realistic state.

Neither changes the closed-beta gate. Phase 7B remains the path to real users.

## Explicitly outside private V1

- public community profiles;
- social feeds, follows, likes, or public comments;
- public wardrobe or outfit discovery;
- marketplace, affiliate, or advertising features;
- silent background tracking of wear, location, calendar, purchases, or travel;
- unreviewed AI providers or autonomous changes to user-owned facts.