# MVP Release-Readiness Handoff

Date: 2026-07-26
Branch: `release/mvp-hardening`
Base: `main` at `62be385f2d51e90063debefa66c16fa53b2f80aa`

## Repository-complete capabilities

- owner-scoped wardrobe records with PostgreSQL row-level security;
- private style profile and optional measurements consent boundary;
- private media quarantine, validation, malware scanning boundary, promotion, access, and deletion;
- manual outfits, revisions, deletion, and explicit wear history;
- provider-neutral explainable recommendations with deterministic fallback;
- deterministic travel planning and packing;
- factual wardrobe coverage, duplication, underuse, cost-per-wear, and wish-list impact;
- release validation through lint, strict TypeScript, unit/application tests, production build, and Chromium E2E;
- fail-closed production environment verifier;
- documented migration, smoke, rollback, and incident stop procedures.

## Release-readiness matrix

| Area | Repository status | Production evidence still required |
| --- | --- | --- |
| Application code | Ready for deployment validation | Hosting platform deployment |
| Authentication | Production adapter implemented | Email/account provisioning and live session test |
| PostgreSQL | Migrations and forced RLS implemented | Managed database, runtime-role permissions, backup restore proof |
| Private media | S3 and ClamAV boundaries implemented | Bucket policy, lifecycle rules, scanner deployment and monitoring |
| Recommendations | Deterministic fallback ready | Provider review only when provider mode is enabled |
| Security | Threat models and stop conditions documented | WAF, rate limiting, TLS, secret rotation, penetration testing |
| Observability | Errors fail closed | Logging, metrics, alerting, dashboards, retention |
| Privacy | Owner-scoped data design and export/reset controls | Privacy notice, retention schedule, support process |
| Operations | Release and rollback runbook present | Named operator, incident contacts, deployment rehearsal |

## Release blockers

The MVP must not be described as production-launched until all external evidence above is recorded. CI cannot prove infrastructure isolation, backup restoration, scanner health, email delivery, DNS/TLS configuration, or operational ownership.

## Required validation

```bash
npm install --no-audit --no-fund
npm run verify:production-env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Exact next action

Open the hardening pull request, complete the full GitHub Actions gate, merge to `main`, then select and provision the production hosting, database, private object storage, ClamAV, and authentication-email services using the release runbook.
