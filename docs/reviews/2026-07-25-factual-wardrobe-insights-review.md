# Factual Wardrobe Insights Architecture, Security, Privacy, and Product Review

Date: 2026-07-25  
Scope: Phase 6B deterministic wardrobe insights and optional acquisition cost  
Review mode: role-separated repository review under AIFramework  
Change risk: 2 — private owner-scoped source facts and derived calculations

## Reviewed surfaces

- `src/modules/insights/domain/`
- `src/modules/insights/application/`
- `src/app/insights/`
- `src/app/insights.css`
- wardrobe domain, transport, form, item-detail, and PostgreSQL repository changes
- `migrations/0008_wardrobe_acquisition_cost.sql`
- insight calculation, acquisition-cost, and browser-flow tests
- ADR 0010, Feature 009, and factual-insights threat model

## Architecture review

### Deterministic projection

Status: accepted.

Insights are calculated on demand from owner-scoped wardrobe, outfit, and wear-event repositories. No derived snapshot datastore, model gateway, external catalogue, or price service is introduced.

### Source authority

Status: accepted.

Wardrobe facts, saved outfit membership, and explicit wear events remain authoritative. Insights contain source identifiers and explanations rather than replacing source facts.

### Acquisition-cost compatibility

Status: accepted.

Acquisition fields are additive and nullable for legacy records. Newly created records normalise absent values to null. PostgreSQL uses a paired constraint, integer minor units, bounded values, uppercase currency syntax, and owned-item status enforcement.

### Calculation boundaries

Status: accepted.

Coverage uses four documented broad functional groups. Duplicate signals use keyed category, colour, and brand facts. Wear attribution applies outfit events to current membership and is disclosed as an approximation. Currency conversion and cross-currency totals are absent.

## Security review

### Owner isolation

Status: accepted with deployment verification.

Owner identity is server-resolved. Source repositories are owner-scoped. The existing wardrobe table continues to force RLS, and source links use owner-scoped routes. Production runtime role and transaction-local owner context still require deployed tests.

### Input integrity

Status: accepted.

Acquisition cost requires a positive bounded decimal amount and a three-letter currency code, is converted deterministically to integer minor units, and may be recorded only on an owned item. Amount-only, currency-only, zero, negative, wish-list, and archived combinations are rejected.

### Derived-result safety

Status: accepted.

Calculations do not execute user text, render HTML, or use private notes. Duplicate detection uses map keys rather than arbitrary code or model output. Result records are not persisted.

## Privacy review

### Data minimisation

Status: accepted.

Insight calculation excludes fit notes, outfit styling notes, wear notes, recommendation requests and feedback, travel details, media identifiers, object keys, and image content. The UI uses only structural wardrobe facts and explicit date-only wear facts.

### Financial privacy

Status: accepted with operational verification.

Acquisition cost is optional, user-provided, and item-specific. No spending profile, total wardrobe value, currency conversion, external lookup, or financial recommendation is created. Logs and diagnostics must exclude item costs and result bodies.

### Retention

Status: accepted.

No insight snapshot is retained. Acquisition cost follows the wardrobe item's retention, export, deletion, backup, and restore policy. These operational behaviours require production approval.

## Product review

### Explainability

Status: accepted.

Coverage, duplication, wear attribution, underuse, cost-per-wear, and wish-list impact expose their source counts and methodology. The UI uses factual labels such as `signal`, `gap`, and `not recorded as worn` rather than definitive style judgments.

### User control

Status: accepted.

Users create owned or wish-list records, decide whether to record cost, inspect every source item, and can correct source facts through existing workflows. Wish-list impact does not automatically remove or purchase an item.

### Product restraint

Status: accepted.

The implementation does not infer prices, combine currencies, prescribe gendered capsule rules, use images, rank personal worth, or instruct spending. Missing wear or cost data is shown as unavailable rather than estimated.

### Accessibility

Status: accepted.

All insight states are textual, tables include a caption and labelled columns, source links are keyboard operable, and empty/unavailable states are explicit.

## Validation evidence

The pre-review code gate covers:

- ESLint;
- strict TypeScript;
- existing and new unit/application tests;
- production build;
- Chromium installation;
- browser flow for owned and wish-list creation, acquisition cost, outfit wear, duplication, cost-per-wear, wish-list impact, source links, and methodology.

The first CI run identified legacy test fixtures without the new nullable fields. Compatibility was restored by making acquisition facts optional on legacy-shaped records while factory and PostgreSQL results remain explicitly nullable. A follow-up strict-type issue normalised missing currency to null in the insight result. Zero-value transport validation and SQL null normalisation were also hardened before final approval.

The final documentation-complete GitHub Actions run must be recorded in the handoff before merge.

## Findings and disposition

1. **Legacy wardrobe fixtures lacked acquisition fields** — fixed through backward-compatible optional source typing and explicit factory/database nulls.
2. **Missing currency could propagate as undefined** — fixed by normalising to null in the insight result.
3. **Zero acquisition amount passed the lexical pattern** — fixed with positive-value transport validation.
4. **Current-membership wear attribution is not an immutable historical snapshot** — accepted with prominent methodology disclosure.
5. **Free-text colour and brand normalisation is conservative** — accepted; no semantic or image matching is claimed.
6. **Production-scale calculation performance** — remains a release gate.

## Decision

Approved for merge into `main` after the final documentation-state CI gate is green and its run identifier is recorded.

Not approved for production release until migration, RLS/runtime-role, two-user isolation, log redaction, performance, mixed-currency, retention, backup, restore, and explicit release gates are complete.
