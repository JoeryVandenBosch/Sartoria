# Travel Planning Operations Runbook

## Runtime behaviour

Travel planning uses the existing persistence mode:

```text
SARTORIA_PERSISTENCE_MODE=memory
```

for deterministic local development, or:

```text
SARTORIA_PERSISTENCE_MODE=postgres
DATABASE_URL=<approved PostgreSQL connection>
DATABASE_SSL_MODE=require
```

for production-style persistence.

The initial travel-planning slice has no weather, calendar, location, or AI configuration and makes no external network request.

## Production release gates

1. Apply `0007_travel_plans.sql` through the approved migration runner.
2. Verify `travel_plans` and `travel_plan_items` exist with expected constraints and indexes.
3. Verify RLS is enabled and forced on both tables.
4. Verify the application runtime role is not a superuser and lacks `BYPASSRLS`.
5. Verify transaction-local `app.user_id` is set and cleared correctly by the connection pool.
6. Run two-user isolation tests for preview, create, list, detail, membership, and delete.
7. Test duplicate, missing, archived, wish-list, and cross-owner wardrobe identifiers.
8. Test invalid dates, 61-day duration, activity bounds, item bounds, and stale deletion revision.
9. Prove private destination and note values are absent from logs, diagnostics, traces, and public metadata.
10. Test production-like wardrobe sizes for preview latency and memory usage.
11. Approve plan retention, user deletion, backup retention, restore, and deletion propagation.
12. Record Architecture, Security, Privacy, and Product release approval.

## Deployment sequence

1. Keep Planning navigation disabled in the deployed release.
2. Apply the migration through the approved path.
3. Verify schema, constraints, indexes, RLS, runtime role, backups, and restore procedure.
4. Deploy application code.
5. Run authenticated staging smoke tests with two users.
6. Validate deterministic preview output for cold, mild, hot, business, active, laundry, and coverage-gap cases.
7. Validate owner-controlled final selection and revision-safe deletion.
8. Review logs and telemetry for private-data absence.
9. Obtain release approval.
10. Enable Planning navigation.

## Safe rollback

For application rollback:

- hide the `Planning` navigation;
- disable `/planning` and `/api/planning` route surfaces;
- preserve `travel_plans` and `travel_plan_items` after user data exists;
- do not drop the tables during routine rollback;
- use an approved forward migration, export, or restore procedure.

Local development can return to in-memory mode without modifying production records.

## Incident response

### Cross-owner access concern

1. Disable Planning route surfaces.
2. Preserve identifiers, timestamps, and database evidence without copying private notes unnecessarily.
3. Verify runtime role privileges, RLS state, policy definitions, and transaction-local owner context.
4. Run two-user isolation tests against the affected environment.
5. Follow the approved security and privacy incident process.
6. Re-enable only after remediation and explicit release approval.

### Private trip data in logs

1. Disable affected request-body, error, or trace capture.
2. Restrict access to the affected log store.
3. Determine fields, owners, retention, replication, and downstream processors.
4. Purge according to the approved incident and retention procedure.
5. Add regression tests or redaction controls before restoring full telemetry.

### Incorrect packing suggestions

1. Confirm all returned item identifiers are owned and available.
2. Keep saved plans available; deterministic suggestion errors should not corrupt existing records.
3. Disable preview creation if ownership or integrity is uncertain.
4. Reproduce with non-sensitive fixture data.
5. Correct rules, run the complete packing-rule suite, and verify stable ordering before redeploying.

### Migration or database failure

1. Keep Planning navigation disabled.
2. Do not retry destructive statements manually.
3. Use the approved migration runner and database recovery procedure.
4. Verify tables, memberships, RLS, and foreign keys before route activation.

## Monitoring

Permitted operational signals:

- travel-plan identifier;
- protected internal owner identifier where approved;
- preview success or validation outcome code;
- duration bucket;
- climate and activity counts only when approved as non-sensitive operational dimensions;
- wardrobe candidate count and selected-item count;
- coverage-warning count;
- create, detail, list, conflict, and deletion outcome codes;
- latency and error categories.

Do not log:

- trip name or destination text;
- exact start or end dates;
- private trip notes;
- wardrobe item names, brands, colours, or identifiers in general-purpose logs;
- request or response bodies;
- session, database, or authentication credentials.

## Retention and deletion

- plans remain until the owner deletes them or an approved retention policy applies;
- deletion removes ordered membership through the database cascade;
- archived or deleted source-item behaviour must remain factual and must not silently substitute another item;
- backups and restores must preserve approved deletion obligations;
- any future automatic cleanup requires separate Product and Privacy approval.

## Future weather enrichment

This runbook does not approve external weather or climate processing. A future implementation requires:

- a provider-neutral gateway;
- explicit user action;
- separate data-minimisation and subprocessor review;
- broad location input unless precise location is demonstrably necessary;
- bounded request/response schemas;
- manual climate expectation as an override;
- deterministic planning fallback during provider failure;
- dedicated threat model, tests, operations runbook, and release approval.
