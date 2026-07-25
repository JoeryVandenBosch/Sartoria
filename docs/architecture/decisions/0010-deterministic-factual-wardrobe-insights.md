# ADR 0010 — Deterministic Factual Wardrobe Insights

Status: accepted  
Date: 2026-07-25  
Decision owners: Architecture, Product, Security, Privacy

## Context

Sartoria now records owner-scoped wardrobe items, saved outfits, explicit date-only wear events, style preferences, recommendations, and travel plans. The next capability is helping a user understand what they own and how it is used without introducing opaque scoring, external price lookups, or recommendation AI.

## Decision

Implement wardrobe insights as an on-demand deterministic projection over the authenticated owner's current wardrobe, saved outfits, and explicit wear events.

The first insight set contains:

- ownership totals for owned, wish-list, and archived items;
- category counts and broad functional coverage;
- exact and near-duplicate signals based on explicit category, colour, and brand facts;
- outfit-membership count per item;
- attributed wear count and last-worn date per item;
- underuse indicators based on explicit wear history;
- optional cost-per-wear when the user recorded acquisition cost and attributed wear exists;
- wish-list purchase-impact analysis against current owned coverage and duplication signals;
- clear methodology and limitations.

Insights are calculated on request and are not persisted in the initial slice. Source facts remain authoritative and correctable through their existing workflows.

## Acquisition-cost facts

Add optional user-provided acquisition cost to wardrobe items:

- integer minor-unit amount;
- three-letter uppercase currency code;
- both fields must be present together;
- values are never inferred or fetched externally;
- acquisition cost is accepted only for items with status `owned`;
- zero and negative values are rejected;
- cost-per-wear is unavailable until at least one attributed wear exists.

The application does not convert currencies. Totals across different currencies are not combined.

## Wear attribution

A wear event belongs to an outfit. For the first insight slice, each event contributes one attributed wear to every wardrobe item in that outfit's current saved membership.

This is a transparent approximation, not an immutable historical snapshot. If outfit membership changes later, historical attribution follows the current outfit definition. The UI and methodology must disclose this limitation. Future immutable wear snapshots require a separate migration and ADR.

## Duplication rules

Signals are factual heuristics, not style judgments:

- `exact-signal`: same category, normalised primary colour, and normalised brand among owned items;
- `near-signal`: same category and normalised primary colour among owned items;
- wish-list impact uses the same facts plus current category depth;
- names and private notes are not used for fuzzy semantic matching;
- no image similarity or external catalogue data is used.

## Coverage rules

Coverage uses broad functional groups rather than gendered or prescriptive wardrobe rules:

- upper layers: shirts, tops, knitwear;
- lower or one-piece coverage: trousers, denim, skirts, dresses;
- footwear;
- finishing or weather layers: outerwear, tailoring.

A missing group is presented as a factual coverage gap, not a requirement to purchase. Full category counts remain visible so users can interpret the result.

## Underuse rules

- wear data is considered available only when at least one outfit wear event exists;
- items with zero attributed wears are `not recorded as worn`;
- items with one attributed wear may be marked `lightly used` when broader wear history exists;
- no item is labelled underused when the user has recorded no wear history at all;
- archived and wish-list items are excluded from owned-item underuse rankings.

## Purchase-impact rules

For each wish-list item, compute:

- same-category owned count;
- same-category-and-colour owned count;
- same-category-colour-and-brand owned count;
- whether it contributes to a missing functional group;
- duplication risk as low, medium, or high;
- a concise source-fact explanation.

The analysis does not recommend spending, estimate resale value, fetch market prices, or provide financial advice.

## UI

Provide `/insights` with:

- summary metrics;
- broad coverage and category distribution;
- duplication clusters with links to source items;
- item-usage table with source outfit and wear facts;
- optional cost-per-wear values in each item's recorded currency;
- wish-list impact cards;
- visible methodology and limitations;
- empty states that explain which source facts are missing.

## Security and privacy controls

- resolve owner identity only on the server;
- query wardrobe, outfits, and wear events through owner-scoped repositories;
- do not persist calculated insight snapshots in the initial slice;
- do not send source facts to any external provider;
- exclude private fit notes, styling notes, wear notes, recommendation notes, travel notes, and media data;
- do not combine or convert currencies;
- do not log item names, costs, wear dates, or calculated insight contents;
- expose source links only through owner-scoped routes;
- use generic not-found semantics for inaccessible source records.

## Consequences

### Positive

- users receive immediate, explainable value from existing facts;
- calculations are stable, inspectable, and provider-independent;
- cost-per-wear is grounded only in user-provided cost and explicit wear history;
- purchase impact is descriptive rather than manipulative;
- no new sensitive insight datastore is introduced.

### Trade-offs

- outfit edits can change historical wear attribution;
- duplicate signals are conservative and do not detect visual similarity;
- users without wear history or cost data see limited metrics;
- broad coverage groups cannot represent every personal wardrobe philosophy.

## Rejected alternatives

### Use a model to classify duplication and gaps

Rejected because factual calculations should remain reproducible, inspectable, and available without a provider.

### Fetch current retail or resale prices

Rejected because external catalogue matching, currency conversion, market volatility, and financial profiling are outside the MVP boundary.

### Persist daily insight snapshots immediately

Rejected because on-demand calculation is sufficient and avoids stale derived-data retention.

## Rollback

Hide the Insights navigation and disable the `/insights` route. Acquisition-cost columns are additive and may remain unused. Do not remove user-provided cost facts through routine rollback; use an approved forward migration or deletion workflow.
