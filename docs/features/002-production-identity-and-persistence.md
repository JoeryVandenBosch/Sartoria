# Production Identity and Persistence

## Outcome

A signed-in Sartoria user can create and view wardrobe items that remain durable across deployments, while every protected operation enforces ownership through both application predicates and PostgreSQL row-level security.

## Scope

- PostgreSQL connection pool and environment contract;
- versioned wardrobe schema migration;
- PostgreSQL wardrobe repository adapter;
- provider-neutral current-user interface;
- Better Auth server integration and App Router endpoint;
- development identity fallback outside production only;
- protected wardrobe pages and server actions;
- database and authentication health checks that fail closed in production;
- tests for mapping, ownership, missing configuration, and development fallback;
- deployment and rollback documentation.

## Acceptance criteria

1. Production cannot use the development identity adapter.
2. Production cannot use the in-memory wardrobe repository.
3. Every wardrobe query includes the authenticated owner identifier.
4. A user cannot read another user’s wardrobe item even when the item identifier is known.
5. Database queries use parameters for all user-controlled values.
6. PostgreSQL migrations create required constraints, indexes, and row-level security policies.
7. Authentication library types do not cross into wardrobe domain or application interfaces.
8. Missing `DATABASE_URL` or production auth secret fails closed with an actionable error.
9. CI remains deterministic without external infrastructure.
10. Lint, strict type checking, unit tests, production build, and end-to-end development-mode smoke tests pass.

## Out of scope

- public registration launch;
- email delivery and verification;
- password recovery delivery;
- social identity providers;
- multi-factor authentication;
- production database provisioning;
- private wardrobe image storage;
- data migration from a previous production system.

## Privacy and security

- Session tokens, passwords, connection strings, and personal wardrobe data are never logged.
- Authorization is repeated at page, action, route, and repository boundaries where applicable.
- Database row-level security is defence in depth and does not replace application checks.
- Public registration remains disabled until abuse prevention and email verification are operational.

## Rollback

- Keep the development adapters available only for non-production environments.
- Revert application adapter selection without deleting migration history.
- Database migrations use additive changes in this slice; rollback removes policies and tables only when no production data exists or after approved export.
