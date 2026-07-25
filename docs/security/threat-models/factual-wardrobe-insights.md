# Factual Wardrobe Insights Threat Model

Date: 2026-07-25  
Scope: Phase 6B on-demand wardrobe, outfit, wear, acquisition-cost, and wish-list calculations  
Risk: 2 — private owner-scoped source facts and derived calculations

## Assets

- authenticated owner identity;
- wardrobe category, colour, brand, status, and optional acquisition cost;
- saved outfit membership;
- explicit date-only outfit wear events;
- calculated coverage, duplication, underuse, cost-per-wear, and wish-list impact;
- owner-scoped source links;
- PostgreSQL acquisition-cost facts and RLS boundary.

## Trust boundaries

1. Browser to owner-scoped wardrobe creation.
2. Sartoria server to wardrobe, outfit, and wear-event repositories.
3. On-demand calculation to private Insights UI.
4. Application to PostgreSQL under transaction-local `app.user_id`.

No external provider, catalogue, price, image-similarity, or model boundary exists in this slice.

## Data flow

1. The authenticated user records wardrobe facts and may optionally record acquisition cost for an owned item.
2. The server resolves owner identity and loads only that owner's wardrobe, outfits, and explicit wear events.
3. The deterministic insight engine calculates derived results in memory.
4. The result is rendered to the owner and is not persisted as an insight snapshot.
5. Source item links route through existing owner-scoped pages.

## Threats and controls

### Cross-owner source or insight disclosure

Threat: another user's items, outfits, wear events, costs, or derived results enter the calculation or UI.

Controls:

- owner identity is resolved server-side;
- every repository query receives the authenticated owner identifier;
- outfit wear events are queried through owner-scoped outfit identifiers;
- source links use owner-scoped wardrobe routes;
- acquisition-cost columns remain inside the existing forced-RLS wardrobe table;
- inaccessible source records use not-found semantics.

Residual risk: deployed runtime roles and transaction-local owner context require production verification.

### Financial-data overreach

Threat: Sartoria infers prices, converts currencies, aggregates incomparable currencies, or presents spending advice.

Controls:

- acquisition cost is optional and user-provided;
- amount is stored in integer minor units;
- currency is a three-letter code stored with the amount;
- amount and currency must be present together;
- cost is accepted only for owned items;
- no external price lookup or currency conversion exists;
- cost-per-wear is calculated only within one item's recorded currency;
- UI labels the result as a factual calculation, not financial advice.

Residual risk: user-entered currency codes are syntactically validated but not matched to an external ISO registry in this slice.

### Misleading wear attribution

Threat: historical wear is presented as exact item history after outfit membership changes.

Controls:

- methodology explicitly states that outfit events are attributed to current saved membership;
- item outfit-membership and attributed-wear counts are shown separately;
- no wear is inferred from location, calendar, image, or app activity;
- no underuse label appears when no wear history exists;
- future immutable wear snapshots require a separate ADR and migration.

Residual risk: users may still interpret current-membership attribution as historical certainty; wording and methodology must remain visible.

### Manipulative or opaque purchase scoring

Threat: wish-list analysis pressures spending or hides the basis of a score.

Controls:

- risk is low, medium, or high using documented count thresholds;
- same-category, same-colour, and exact-signal counts are displayed;
- broad coverage contribution is stated separately;
- explanations contain source counts;
- no instruction to buy, avoid, or spend is generated;
- no model or external commercial data is used.

Residual risk: broad deterministic thresholds cannot capture every personal style goal and must remain advisory facts only.

### Sensitive notes or media entering calculations

Threat: private fit, outfit, wear, recommendation, travel, or media data leaks into insights or logs.

Controls:

- insight inputs use only explicit structural fields;
- private notes and media objects are excluded from calculation types;
- no external processing exists;
- operational logging policy prohibits item names, costs, wear dates, and result bodies;
- insights are calculated on demand and not stored.

Residual risk: hosting-platform error capture and server-render traces require deployment verification.

### Duplicate-signal false confidence

Threat: simple category, colour, and brand matching is treated as image-level or semantic equivalence.

Controls:

- UI calls results `signals` rather than definitive duplicates;
- exact and near rules are documented;
- names, notes, images, materials, cuts, and external catalogue facts are excluded;
- every cluster links back to source items for user inspection.

Residual risk: normalised free-text colours and brands can still contain user-entry inconsistencies.

### Denial of service from large source sets

Threat: calculating pair-like clusters or loading all wear history becomes expensive.

Controls:

- duplicate detection uses keyed maps rather than all-pairs comparison;
- insight snapshots are not accumulated;
- result sections are bounded by the owner's source records;
- production-like wardrobe and outfit sizes are a release gate.

Residual risk: repository pagination or aggregate SQL may be needed at significantly larger scale.

## Abuse cases

- submit acquisition cost for a wish-list item: rejected at transport, domain, and database constraints;
- submit amount without currency: rejected;
- submit zero or negative amount: rejected;
- submit another user's item through a source URL: owner-scoped detail returns not found;
- create a model-generated duplicate score: no provider integration exists;
- combine EUR and USD cost-per-wear totals: no aggregate is implemented;
- record no wear history and expect underuse labels: status remains unavailable;
- change an outfit and expect immutable historical membership: methodology discloses current-membership attribution.

## Required production verification

- apply `0008_wardrobe_acquisition_cost.sql` through the approved migration path;
- verify acquisition-cost constraints and legacy-null rows;
- verify the runtime role is non-superuser and lacks `BYPASSRLS`;
- run two-user insight isolation tests;
- verify cost, item names, wear dates, and result bodies are absent from logs and diagnostics;
- performance-test production-like wardrobe, outfit, and wear-event volumes;
- verify mixed-currency records are never aggregated;
- approve acquisition-cost retention, export, deletion, backup, and restore behaviour;
- record explicit Architecture, Security, Privacy, and Product release approval.
