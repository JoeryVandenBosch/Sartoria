# Factual Wardrobe Insights Handoff

Date: 2026-07-25  
Branch: `feature/wardrobe-insights`  
Pull request: #14  
Risk: 2 — private owner-scoped wardrobe, wear-history, and optional acquisition-cost calculations

## Delivered

- `/insights` owner-scoped deterministic insight experience;
- optional acquisition cost in integer minor units with three-letter currency;
- wish-list item capture through the wardrobe form;
- additive acquisition-cost migration and PostgreSQL persistence;
- item-detail acquisition-cost visibility;
- owned, wish-list, archived, outfit, and explicit-wear summary facts;
- complete owned-category counts;
- broad functional coverage and factual gaps;
- exact and near duplication signals using category, primary colour, and brand facts;
- current-membership outfit wear attribution;
- outfit-membership, attributed-wear, last-worn, and underuse states;
- optional same-currency cost-per-wear;
- wish-list category, colour, brand, coverage, and duplication-impact analysis;
- source-linked accessible tables and cards;
- visible methodology and limitations;
- no external model, catalogue, price, currency, image, or analytics dependency;
- acquisition-cost, coverage, duplication, wear, underuse, cost-per-wear, wish-list, privacy, and browser-flow tests;
- ADR, acceptance criteria, threat model, review, and operations runbook.

## Validation progression

Initial CI identified three legacy test fixtures that predated nullable acquisition fields and one exact-optional fixture helper. Compatibility was restored by allowing legacy-shaped item records to omit the additive fields while factory and PostgreSQL records normalise them to explicit null.

A later strict-type finding showed that an omitted legacy currency could reach the derived insight as `undefined`. The calculation now normalises this to null. Additional hardening rejects zero acquisition amounts at the transport boundary and persists absent optional values as SQL null.

The final documentation-complete GitHub Actions run identifier must be inserted after the final gate succeeds.

Expected final gate:

- ESLint passes;
- strict TypeScript passes;
- all existing and new unit/application tests pass;
- production build passes;
- Chromium installation passes;
- browser flow passes for owned and wish-list creation, acquisition cost, outfit creation, explicit wear, duplication, cost-per-wear, wish-list impact, methodology, and source visibility.

## Architecture decisions

- insights are calculated on demand and are not persisted;
- all source repositories remain owner-scoped;
- acquisition cost is optional, user-provided, item-specific, and never inferred;
- currencies remain item-local and are never converted or aggregated;
- broad coverage groups are factual and non-prescriptive;
- duplicate signals use explicit category, colour, and brand facts only;
- wear events are attributed to current saved outfit membership;
- no underuse label appears when the user has recorded no wear history;
- wish-list impact exposes source counts instead of a hidden score;
- no recommendation provider or external catalogue participates.

## Security and privacy decisions

- owner identity is resolved server-side;
- private notes, media data, recommendation data, and travel data are excluded;
- amount and currency must be present together;
- acquisition cost is positive, bounded, and allowed only for owned items;
- source links remain owner-scoped;
- insight results are not retained;
- operational logs must exclude item names, costs, exact wear dates, and result bodies;
- existing wardrobe RLS remains the database isolation boundary;
- acquisition cost follows wardrobe export, deletion, backup, and restore policy.

## Production work still blocked

- apply `0008_wardrobe_acquisition_cost.sql` through the approved migration path;
- verify legacy-null rows and all acquisition constraints;
- verify runtime role is non-superuser and lacks `BYPASSRLS`;
- run deployed two-user insight isolation tests;
- verify private values and result bodies are absent from logs, traces, diagnostics, and analytics;
- performance-test production-like wardrobe, outfit, and wear-event volumes;
- verify mixed currencies are never combined;
- approve acquisition-cost export, retention, deletion, backup, and restore behaviour;
- obtain explicit Architecture, Security, Privacy, and Product production release approval.

## Rollback

Hide Insights navigation and disable `/insights`. Preserve additive acquisition-cost columns and user-provided facts. Do not drop the columns during routine rollback. No derived insight snapshots require deletion.

## Exact next action

Run the final documentation-complete CI gate and merge PR #14 only after it is green. After merge, complete MVP release hardening: deployed infrastructure checklist, end-to-end production configuration documentation, release-candidate evidence, and an explicit list of external release blockers.
