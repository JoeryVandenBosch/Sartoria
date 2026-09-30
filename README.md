# Sartoria

**Elegantia in Simplicitate.**

Sartoria is a premium personal wardrobe and style system that helps people understand what they own, build coherent outfits, buy with intent, and maintain a refined personal style over time.

**Sartoria is a native mobile application for the Apple App Store.** The Next.js application in this repository serves the HTTP API and a transitional web interface retained as a behavioural reference until the equivalent native screens exist. See ADR 0012 and `VISION.md`.

## Product direction

- Premium, discreet, and calm rather than trend-driven
- Italian-chic visual language with old-money restraint
- Crown-based identity retained as the primary logo direction
- Personal recommendations grounded in the user’s actual wardrobe, fit, preferences, occasions, and climate
- Explainable advice instead of opaque AI output
- Privacy-first handling of wardrobe images, measurements, wear history, travel context, and personal data
- Private, invitation-controlled V1; public community and discovery remain backlog items

## Foundation

This repository uses AIFramework v1.0 as its engineering and AI-collaboration foundation.

All coding agents begin with `AGENTS.md`, route execution through `AI_OPERATIONS/AI_PROJECT_MANAGER.md`, and follow `AI_AGENTS.md`, `CLAUDE.md`, `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, active ADRs, the latest handoff, and repository governance.

## Platform

- Next.js App Router and strict TypeScript
- Modular monolith with explicit domain boundaries
- PostgreSQL persistence through repository interfaces and forced row-level security
- Better Auth behind a provider-neutral current-user boundary
- Quarantine-first private S3-compatible storage for wardrobe imagery
- ClamAV malware-scanning boundary and protected media worker
- Provider-neutral explainable recommendations with deterministic fallback
- Deterministic travel planning independent of weather, calendar, location, or AI providers
- Responsive, accessible premium interface
- Standalone non-root container with HTTPS staging topology and health probes

## Implemented private MVP

The repository contains reviewed, tested, and merged vertical slices for:

- owner-scoped wardrobe and wish-list items;
- optional user-provided acquisition cost facts;
- quarantine, verification, binary detection, malware scanning, promotion, private access, and deletion for wardrobe media;
- private style profile, explicit measurement consent, export, optimistic revisions, and reset;
- manual outfits, revision-safe editing, deletion, and owner-verified wardrobe membership;
- explicit date-only private wear history and correction;
- explainable recommendation requests, provider-neutral structured output, confidence gating, provenance, correction, rejection, expiry, deletion, and deterministic fallback;
- private date-only travel plans, deterministic packing targets, user-controlled item selection, coverage warnings, and deletion;
- deterministic factual insights for category coverage, duplicates, underuse, wear frequency, optional cost-per-wear, and wish-list purchase impact;
- production identity and PostgreSQL adapters that fail closed when required configuration is absent;
- release environment verification, migration order, smoke checks, rollback guidance, and incident stop conditions;
- a private staging package with PostgreSQL, MinIO, ClamAV, Caddy, migration jobs, liveness/readiness probes, and live verification;
- a staging-only, one-time, audited Better Auth bootstrap for the owner and a second isolation-test identity while public sign-up remains disabled.

Local development remains deterministic through explicit development identity, in-memory persistence, private development media storage, signature-only media validation, recommendation fallback, and deterministic travel planning.

## Current delivery boundary

The codebase and deployment package are ready for live staging execution. The product is not yet described as staging-accepted or production-launched.

External work tracked in issue `#17` still requires a real host, DNS, TLS, digest-pinned service images, externally stored secrets, backup destination, migrations, identity bootstrap, owner-isolation testing, media scanning proof, restart persistence, and restore rehearsal.

When infrastructure is unavailable, the next repository-owned slice is Phase 7B closed-beta readiness: operational observability, bounded rate limiting, invitation-controlled onboarding, backup automation interfaces, privacy/retention controls, and launch evidence. Public community and discovery are excluded from V1.

## Development

```bash
cp .env.example .env.local
npm install --no-audit --no-fund
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Deployment-only validation:

```bash
npm run verify:production-env
npm run verify:staging
```

Database setup and migration instructions live in `migrations/README.md`. The complete staging procedure lives in `docs/operations/private-staging-deployment.md`. Feature-specific operations and rollback guidance live under `docs/operations/`.

## Documentation

- `AGENTS.md` — canonical entry point for coding agents
- `CLAUDE.md` — Claude execution and implementation contract
- `VISION.md` — product promise, users, scope, and success criteria
- `ROADMAP.md` — delivery phases, status, and next repository-owned work
- `ARCHITECTURE.md` — technical boundaries and quality attributes
- `SECURITY.md` — security and privacy obligations
- `AI_AGENTS.md` — AI roles and handoff rules
- `AI_OPERATIONS/` — context loading, model routing, token strategy, self-review, memory, and execution rules
- `docs/features/` — acceptance-ready vertical slices
- `docs/architecture/decisions/` and `docs/adr/` — architecture decisions
- `docs/security/` — threat models and role-separated reviews
- `docs/operations/` — deployment, rollback, monitoring, and incident runbooks
- `docs/handoffs/` — validated delivery and continuation state

## License

MIT