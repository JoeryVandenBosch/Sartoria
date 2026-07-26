# Private Staging Deployment Package Handoff

Date: 2026-07-26
Branch: `deploy/private-staging`
Base: `main` at `eb6a710404386e776752c6b4f913b6c1b80c0a7f`
Initial validated head: `78d3dae77a2f44ba9116ea67c1863c24f6203e6b`
GitHub Actions run: `30193246708`

## Delivered

- multi-stage Node.js 24 container build;
- non-root Next.js standalone runtime;
- separate migration target for Better Auth and Sartoria migrations;
- liveness and database readiness endpoints;
- HTTPS Caddy edge configuration;
- private Docker service topology for PostgreSQL, MinIO and ClamAV;
- bucket creation with anonymous access disabled;
- application and infrastructure environment templates;
- private-media CORS template;
- exact deployment, migration, health, acceptance, backup and stop procedures;
- CI validation of the Compose model and standalone deployment artifact.

## Validation evidence

Run `30193246708` completed successfully with:

- production environment contract;
- staging Compose configuration;
- lint;
- strict TypeScript;
- unit and application tests;
- production build;
- standalone server artifact;
- Chromium installation;
- complete end-to-end smoke suite.

## Security and privacy boundaries

- only Caddy publishes host ports;
- PostgreSQL, MinIO console and ClamAV are not mapped to public host ports;
- the application runtime runs as a non-root user;
- public sign-up remains disabled;
- media enters quarantine and requires scanner approval before private access;
- storage anonymous access is explicitly disabled;
- deterministic recommendation fallback remains the staging default;
- readiness does not expose configuration or database error details.

## Staging blockers outside the repository

The package is complete, but a live staging environment is not yet proven. An operator must still provide:

1. a staging host and regional placement;
2. application and media DNS records;
3. approved digest-pinned service images;
4. generated secrets stored outside Git;
5. an audited one-time owner-account bootstrap path;
6. backup storage and a successful restore rehearsal;
7. TLS issuance proof;
8. ClamAV signature-freshness proof;
9. cross-owner isolation evidence from two real accounts;
10. named staging operator and incident contact.

## Release decision

Repository decision: **deployment package approved after final documentation-complete CI**.

Operational decision: **do not describe Sartoria as deployed or staging-accepted until every external blocker is evidenced and the full live acceptance checklist passes**.
