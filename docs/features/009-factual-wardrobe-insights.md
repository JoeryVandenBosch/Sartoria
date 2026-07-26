# Feature 009 — Factual Wardrobe Insights

Status: implementation ready  
Risk: 2 — private owner-scoped wardrobe, wear-history, and optional acquisition-cost calculations

## User outcome

A signed-in user can understand category coverage, duplication, outfit use, explicit wear frequency, optional cost-per-wear, and the likely impact of a wish-list item through deterministic calculations linked to the source wardrobe facts.

## In scope

- optional user-provided acquisition cost for owned wardrobe items;
- ownership and category totals;
- broad functional coverage;
- exact and near-duplicate signals;
- outfit-membership and attributed-wear counts;
- last-worn date from explicit outfit wear events;
- underuse indicators only when wear history exists;
- cost-per-wear in the item's recorded currency when calculable;
- wish-list duplication and coverage impact;
- owner-scoped source-item links;
- visible methodology and limitations;
- deterministic server-side calculation without external providers.

## Out of scope

- external retail, resale, or market prices;
- currency conversion;
- investment or financial advice;
- image-similarity analysis;
- semantic model classification;
- background tracking;
- inferred wear from location, calendar, media, or application activity;
- prescriptive gendered capsule rules;
- automatic purchases or wish-list removal;
- persisted insight snapshots.

## Acceptance criteria

### Acquisition cost

1. Acquisition cost is optional and user-provided.
2. Amount is stored as a positive integer minor-unit value.
3. Currency is a three-letter uppercase code.
4. Amount and currency must be present together.
5. Cost may be recorded only for items with status `owned`.
6. Existing items without cost remain valid.
7. No currency conversion or external price lookup occurs.
8. Item detail shows the recorded cost when present.

### Ownership and coverage

1. `/insights` uses only records belonging to the authenticated owner.
2. Owned, wish-list, and archived totals are shown separately.
3. Every wardrobe category shows an owned-item count.
4. Broad upper-layer, lower-or-one-piece, footwear, and finishing-layer coverage is calculated from explicit categories.
5. Missing coverage is described factually and does not create a purchase recommendation.
6. Empty wardrobes receive a clear source-data empty state.

### Duplication

1. Exact-signal groups require matching category, normalised colour, and normalised brand.
2. Near-signal groups require matching category and normalised colour.
3. Each cluster contains at least two owned items.
4. An exact cluster is not duplicated as a separate near cluster containing the same item set.
5. Cluster explanations list the explicit matching facts.
6. Private notes and images are not used.

### Wear and underuse

1. Wear counts derive only from explicit owner-scoped outfit wear events.
2. One event contributes one attributed wear to each item in the outfit's current membership.
3. Outfit membership count and attributed wear count are distinct values.
4. Last-worn date is the latest contributing date-only event.
5. No item is labelled underused when no wear events exist.
6. With wear history, zero-wear owned items are marked not recorded as worn.
7. With broader wear history, one-wear items may be marked lightly used.
8. The current-membership attribution limitation is visible in methodology text.

### Cost-per-wear

1. Cost-per-wear appears only when acquisition cost and at least one attributed wear exist.
2. Calculation is acquisition minor units divided by attributed wears.
3. Rounding is deterministic to the nearest minor unit.
4. Values remain in the item's recorded currency.
5. Different currencies are never aggregated.
6. Zero-wear items show that cost-per-wear is not yet available.

### Wish-list impact

1. Each wish-list item is compared only with owned items from the same owner.
2. Analysis reports same-category, same-colour, and same-brand-and-colour overlap counts.
3. Missing functional-group contribution is reported when applicable.
4. Duplication risk is low, medium, or high using documented deterministic thresholds.
5. Explanation contains source counts and no hidden score.
6. The UI does not instruct the user to buy or avoid buying.

### Privacy and security

1. Owner identity is resolved server-side.
2. Calculations use owner-scoped wardrobe, outfit, and wear-event repositories.
3. Private fit, styling, wear, recommendation, and travel notes are excluded.
4. Media data and external providers are excluded.
5. Item names, costs, wear dates, and result bodies are not written to operational logs.
6. Insights are calculated on demand and are not persisted in this slice.

### Accessibility

1. Every insight is expressed in text rather than colour alone.
2. Tables have captions or accessible headings and labelled columns.
3. Source links are keyboard operable.
4. Empty and unavailable states are explicit.
5. Focus remains visible.

### Validation gate

- ESLint passes;
- strict TypeScript passes;
- domain, acquisition-cost, duplication, coverage, wear-attribution, underuse, cost-per-wear, and purchase-impact tests pass;
- production build passes;
- Chromium end-to-end wardrobe setup, wear recording, wish-list impact, and insight rendering passes;
- Architecture, Security, Privacy, and Product review is recorded before merge.

## Rollback

Hide Insights navigation and disable the `/insights` route. Preserve optional acquisition-cost facts and additive database columns. Do not discard user-provided cost data through routine rollback.
