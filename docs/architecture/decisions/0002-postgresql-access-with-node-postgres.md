# ADR 0002: PostgreSQL access with node-postgres

- Status: Accepted
- Date: 2026-07-25
- Owners: Architecture, Security and Privacy
- Risk level: 3

## Context

Sartoria requires durable, private, owner-scoped storage for wardrobe, profile, outfit, planning, recommendation, insight, and media metadata. The domain model must remain independent from database libraries and managed database vendors.

The first wardrobe slice currently uses an explicit in-memory development adapter. The next production foundation needs PostgreSQL persistence without introducing an ORM-owned domain model or provider lock-in.

## Decision

Use PostgreSQL as the system of record and `pg` (node-postgres) as the initial low-level database client.

- Application and domain modules depend only on repository interfaces.
- PostgreSQL adapters use parameterised SQL and explicit row mapping.
- Connection pooling is centralised in `src/lib/database/postgres-pool.ts`.
- Repository methods always include an owner boundary in reads and writes.
- Migrations are committed as ordered SQL files under `migrations/`.
- Multi-statement operations use a checked-out client and explicit transactions.
- Production requires TLS-capable database connectivity and managed secret storage.
- Database roles used by the application must not own protected tables.
- Row-level security is enabled for user-owned tables as defence in depth. Application-level owner checks remain mandatory.

## Consequences

### Positive

- The domain remains independent from persistence technology.
- SQL, ownership predicates, indexes, and migration behaviour remain reviewable.
- Any standards-compliant managed PostgreSQL service can be used.
- Database row-level security adds a second isolation boundary.

### Costs

- Mapping and migration code is maintained by the repository.
- Query composition is more explicit than with an ORM.
- Schema changes require disciplined migration review and rollback planning.

## Rejected alternatives

- An ORM as the canonical domain model: rejected because it would couple domain behaviour to persistence structures.
- A vendor-specific database SDK: rejected because it would weaken portability.
- Continuing with in-memory persistence beyond development: rejected because it cannot provide durability or deployment readiness.

## Validation

- Repository adapter tests must verify owner isolation and parameterised queries.
- Migrations must be reviewed for least privilege, indexes, constraints, and reversible rollout.
- CI must continue to run without a production database by testing against repository interfaces and deterministic fakes.
