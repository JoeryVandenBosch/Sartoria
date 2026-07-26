# Final Claude-Readiness Audit

Date: 2026-07-26
Repository: `JoeryVandenBosch/Sartoria`
Audit branch: `audit/claude-readiness`
Base: `main` at `f515cb677225e57cd1df167da6a15148208e55fa`
Risk: 3 — repository governance, deployment, security, and operational boundaries

## Objective

Perform a repository-wide consistency and readiness review after the private MVP, release hardening, staging package, and audited identity bootstrap were merged. The audit must leave Claude with an accurate baseline, an exact first coding slice, and no silent claim that external staging or production has already been completed.

## Scope reviewed

- agent and Claude entry contracts;
- product scope and private-V1 exclusions;
- roadmap and completed feature state;
- architecture and module boundaries;
- authentication, owner isolation, row-level security, media, recommendation, travel, insight, and bootstrap boundaries;
- migration ordering and rollback guidance;
- environment verification and deployment commands;
- container image and network configuration;
- secret and evidence exclusion from Git and image contexts;
- CI gates, tests, standalone build, and Chromium flow;
- open pull requests, issue `#17`, and exact next work;
- Claude model-routing and self-review entry points.

## Findings corrected

### 1. Stale continuation contracts

`CLAUDE.md`, `README.md`, `ROADMAP.md`, migration guidance, and `.ai/readiness.json` still described earlier phases or the first wardrobe slice.

Correction:

- reconciled every entry document with the merged private MVP and staging package;
- made issue `#17` the canonical external staging gate;
- recorded Phase 7B as the next repository-owned coding phase;
- explicitly kept public community, discovery, and sharing outside private V1;
- encoded Claude’s autonomous execution mode without repetitive approval requests.

### 2. Staging command working directory

The staging runbook changed into `deploy/staging` but invoked root npm scripts as though `package.json` were in that directory.

Correction:

- all root commands now use `npm --prefix ../..`;
- shell loading of `.env` and `staging.env` is explicit;
- Git commit lookup uses `git -C ../..`;
- migration, bootstrap, evidence, and removal commands are executable from one documented operator directory.

### 3. Floating application base image

Service documentation required digest pinning, but the Dockerfile hardcoded `node:24-alpine`.

Correction:

- `NODE_IMAGE` is now a required Docker build argument;
- application and migration builds receive the same explicit image reference;
- staging image verification rejects references without an `@sha256` digest;
- CI tests accepted and rejected image-reference forms;
- the deployed staging environment verifier requires all image digests.

### 4. Staging network segmentation

Database and scanner services shared an internet-capable network with the edge.

Correction:

- Caddy uses an edge network;
- PostgreSQL, ClamAV and migration jobs use an internal data network;
- the application and object storage bridge only the networks required for their responsibilities;
- no database, scanner, application, or MinIO console port is published directly.

### 5. Staging secret and evidence exclusion

`deploy/staging/staging.env` was documented as private but was not explicitly excluded from Git or Docker build contexts.

Correction:

- `.gitignore` and `.dockerignore` now exclude staging environment files, generated CORS policy, and staging evidence JSON;
- a repository-side staging package verifier enforces these exclusions and the network/image invariants;
- CI runs the package verifier.

### 6. Environment-contract coverage

CI validated production mode but did not execute the staging-specific environment branch.

Correction:

- CI now validates production and staging environment contracts separately;
- staging validation covers the explicit internal-database exception, disabled bootstrap default, and immutable images;
- Compose configuration, lint, strict types, tests, build, standalone artifact, and Chromium remain mandatory.

## Existing high-value controls confirmed

- Better Auth public sign-up is disabled.
- Staging identity bootstrap is staging-only, bearer-protected, one-time, and fail-closed.
- Bootstrap creates two normal users through Better Auth and stores no password or token in the audit table.
- A pending bootstrap audit is an operational stop condition rather than an automatic retry path.
- Owner-scoped application tables use forced row-level security.
- Private media remains quarantine-first and unavailable before verification and scanning.
- Recommendation provider output is bounded, schema-validated, owner-verified, confidence-gated, and optional.
- Core wardrobe, outfit, travel, and insight behaviour remains deterministic without AI.
- Live staging verification checks HTTPS, health, bootstrap state, security headers, and anonymous bucket denial without credentials.

## Dependency pull requests

Open Dependabot pull requests are not part of this audit and must not be merged incidentally:

- `#1` — Playwright minor upgrade;
- `#3` — ESLint major upgrade;
- `#5` — TypeScript and Node type major upgrades.

They require dedicated dependency-maintenance branches and the complete gate after the Claude-readiness audit. Their presence does not block continued feature coding on the validated pinned stack.

## Remaining external blockers

The repository cannot create or prove these without real infrastructure and operator access:

- Linux host and regional placement;
- DNS, TLS and ingress restrictions;
- approved real image digests;
- secret-manager values;
- off-host backup destination;
- live Better Auth and application migrations;
- identity bootstrap execution and removal;
- ClamAV signature health;
- private bucket policy and CORS evidence;
- cross-owner deployed isolation;
- restart persistence and restore rehearsal;
- named staging operator and incident contact.

These remain tracked by issue `#17`. Sartoria must not be described as staging-accepted or production-launched until every required checkbox and evidence item is complete.

## Approved next coding work

When external staging inputs are unavailable, Claude starts `docs/features/0010-closed-beta-observability.md` as the first Phase 7B vertical slice. This is repository-owned implementation work and does not require waiting for host or DNS credentials.

## Validation evidence

Pending final pull-request validation. Record the final head, workflow run, test totals, build, standalone, Compose, environment, staging-package, and Chromium results before merge.

## Audit conclusion

Repository structure and product implementation are suitable for Claude continuation once this audit branch passes the complete gate and merges. External staging remains a separate operator-controlled acceptance process.