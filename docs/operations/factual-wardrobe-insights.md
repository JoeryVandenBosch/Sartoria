# Factual Wardrobe Insights Operations Runbook

## Runtime behaviour

Insights use existing owner-scoped persistence and are calculated on demand. No additional service, queue, model, catalogue, currency, image, or analytics provider is required.

Local development:

```text
SARTORIA_PERSISTENCE_MODE=memory
```

Production-style persistence:

```text
SARTORIA_PERSISTENCE_MODE=postgres
DATABASE_URL=<approved PostgreSQL connection>
DATABASE_SSL_MODE=require
```

## Acquisition-cost storage

`0008_wardrobe_acquisition_cost.sql` adds:

- `acquisition_cost_minor bigint NULL`;
- `acquisition_currency text NULL`;
- a paired constraint requiring positive bounded cost, three-letter uppercase currency, and `owned` status.

Legacy rows remain null. The application never converts currencies and does not calculate total wardrobe value.

## Production release gates

1. Apply `0008_wardrobe_acquisition_cost.sql` through the approved migration runner.
2. Verify legacy rows contain null for both acquisition columns.
3. Verify paired, positive, upper-bound, currency-format, and owned-status constraints.
4. Verify the application runtime role is not a superuser and lacks `BYPASSRLS`.
5. Verify wardrobe RLS remains enabled and forced.
6. Run two-user isolation tests for wardrobe creation, item detail, insight calculation, and source links.
7. Test amount-only, currency-only, zero, negative, oversized, malformed-currency, wish-list-cost, and archived-cost submissions.
8. Verify item names, costs, exact wear dates, and insight result bodies are absent from logs, traces, diagnostics, and analytics.
9. Performance-test production-like wardrobe, outfit, and wear-event volumes.
10. Verify mixed-currency items never produce combined totals or implicit conversion.
11. Approve acquisition-cost export, retention, item deletion, account deletion, backup, restore, and deletion propagation.
12. Record explicit Architecture, Security, Privacy, and Product release approval.

## Deployment sequence

1. Keep Insights navigation disabled in the deployed release.
2. Apply the migration through the approved path.
3. Verify schema, constraints, RLS, runtime role, backups, and restore procedure.
4. Deploy application code.
5. Run deterministic calculation tests against staging fixtures.
6. Run authenticated two-user isolation tests.
7. Validate null-cost, one-wear, zero-wear, mixed-currency, duplicate, wish-list, and no-history cases.
8. Review server, database, tracing, and analytics logs for private-data absence.
9. Measure response time and memory with production-like source volumes.
10. Obtain release approval.
11. Enable Insights navigation.

## Safe rollback

For application rollback:

- hide the `Insights` navigation;
- disable `/insights` route rendering;
- preserve acquisition-cost columns and user-provided values;
- keep wardrobe creation operational without cost fields if necessary;
- do not drop additive columns after user data exists;
- use an approved forward migration, export, or restore process.

No insight snapshots require cleanup because the initial implementation persists no derived results.

## Incident response

### Cross-owner insight concern

1. Disable `/insights` immediately.
2. Preserve identifiers, timestamps, database role state, and policy evidence without copying item names, costs, or wear dates unnecessarily.
3. Verify runtime role privileges, RLS state, policies, connection-pool owner context, and owner-scoped repository parameters.
4. Run two-user source and rendered-result tests.
5. Follow the approved security and privacy incident process.
6. Re-enable only after remediation and explicit approval.

### Acquisition cost in logs or analytics

1. Disable the affected logging, request capture, trace attribute, or analytics event.
2. Restrict access to the affected data store.
3. Determine owners, fields, retention, replication, exports, and downstream processors.
4. Purge according to the approved incident and retention process.
5. Add redaction and regression tests before restoring telemetry.

### Incorrect cost-per-wear

1. Verify the source acquisition amount and currency.
2. Verify explicit outfit wear events and current outfit membership.
3. Confirm no currency conversion or aggregation occurred.
4. Explain the current-membership attribution limitation to affected users where required.
5. Disable the cost-per-wear column if calculation integrity is uncertain while preserving source records.
6. Correct deterministic logic and run the complete insight test suite before redeployment.

### Performance degradation

1. Disable Insights navigation without affecting wardrobe, outfit, wear, planning, or recommendation workflows.
2. Measure source record counts, query latency, event-loading behaviour, and calculation time.
3. Avoid logging private source values during diagnosis.
4. Introduce owner-scoped aggregates, pagination, or indexed queries only through a reviewed ADR and migration.

## Monitoring

Permitted operational signals:

- request identifier;
- protected internal owner identifier where approved;
- source item, outfit, and wear-event count buckets;
- calculation duration bucket;
- number of coverage gaps, duplicate clusters, usage rows, and wish-list analyses;
- unavailable-cost-per-wear count;
- route success, validation, and error outcome codes.

Do not log:

- item names, brands, colours, or identifiers in general-purpose logs;
- acquisition amounts or currencies;
- exact wear dates;
- duplicate-cluster membership;
- wish-list item details or impact explanations;
- request or rendered-result bodies;
- private notes, media data, session data, or credentials.

## Retention and deletion

- insight results are not persisted;
- acquisition cost follows the wardrobe item's lifecycle;
- deleting an item must remove its acquisition fields with the item record;
- account export and deletion must include and remove acquisition cost according to the approved policy;
- backups and restores must preserve approved deletion obligations;
- future insight snapshots or aggregates require separate retention and deletion approval.

## Methodology stability

Any change to these rules requires updated tests, documentation, and Product review:

- broad functional coverage groups;
- exact and near duplicate keys;
- current-membership wear attribution;
- underuse thresholds;
- cost-per-wear rounding;
- wish-list duplication-risk thresholds;
- source fields included or excluded.

Image similarity, semantic models, external prices, currency conversion, immutable historical wear snapshots, and persisted insight trends are not approved by this runbook.
