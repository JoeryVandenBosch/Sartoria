# Sartoria

**Elegantia in Simplicitate.**

Sartoria is a premium personal wardrobe and style system that helps people understand what they own, build coherent outfits, buy with intent, and maintain a refined personal style over time.

## Product direction

- Premium, discreet, and calm rather than trend-driven
- Italian-chic visual language with old-money restraint
- Crown-based identity retained as the primary logo direction
- Personal recommendations grounded in the user’s actual wardrobe, fit, preferences, occasions, and climate
- Explainable advice instead of opaque AI output
- Privacy-first handling of wardrobe images, measurements, and personal data

## Foundation

This repository uses AIFramework v1.0 as its engineering and AI collaboration foundation.

All coding agents begin with `AGENTS.md`, route execution through `AI_OPERATIONS/AI_PROJECT_MANAGER.md`, and follow `AI_AGENTS.md`, `CLAUDE.md`, `VISION.md`, `ARCHITECTURE.md`, `ROADMAP.md`, active ADRs, and repository governance.

## Platform direction

- Next.js and TypeScript web application
- Modular monolith with explicit domain boundaries
- PostgreSQL persistence through repository interfaces
- Better Auth behind a provider-neutral current-user boundary
- Quarantine-first private object storage for wardrobe imagery
- Provider-neutral AI integration layer
- Responsive, accessible premium interface

## Delivery status

The engineering foundation, wardrobe item vertical slice, production identity boundary, PostgreSQL persistence, private wardrobe media, owner-scoped style profile, deterministic manual outfit composition, and private outfit lifecycle are security-reviewed and validated.

Private media includes owner-scoped metadata, direct quarantine upload policies, storage verification, binary type detection, streaming malware-scanning boundaries, protected worker dispatch, short-lived read URLs, deterministic development adapters, and deletion propagation.

The private style profile includes fit, colour, style, brand, material, climate, and recommendation controls; optional measurements behind explicit recommendation consent; optimistic revisions; owner-scoped JSON export and reset; PostgreSQL row-level security; and deterministic development persistence.

Manual outfits include owner-verified wardrobe membership, private occasion and styling context, owner-scoped list and detail pages, relational PostgreSQL persistence with owner-inclusive foreign keys, forced row-level security, and deterministic in-memory development behaviour. No AI is required to create or inspect an outfit.

Outfit lifecycle adds revision-safe editing and confirmed deletion, explicit date-only private wear events, factual wear-count and last-worn views, individual history correction, cascade deletion, and forced-RLS PostgreSQL persistence. Sartoria does not infer wear from location, calendars, images, page activity, or background tracking.

Managed PostgreSQL, object storage, queue, scanner, secret storage, production migration execution, cross-user deployment verification, backup-retention verification, and explicit production release approval remain pending external deployment work.

Local development deliberately uses explicit development identity, in-memory persistence, private development media storage, and signature-only media validation. Production modes fail closed when required database, authentication, storage, queue, worker, or scanner configuration is absent.

The next product slice is a provider-neutral, schema-validated, explainable recommendation foundation with a deterministic fallback and no autonomous purchasing behaviour.

## Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Validation:

```bash
npm run validate
npm run test:e2e
```

Database setup and migration instructions live in `migrations/README.md`. Private media deployment guidance lives in `docs/operations/private-media.md`.

## Documentation

- `VISION.md` — product promise, users, scope, and success criteria
- `ROADMAP.md` — phased delivery and exit criteria
- `ARCHITECTURE.md` — technical boundaries and quality attributes
- `SECURITY.md` — security and privacy obligations
- `CLAUDE.md` — implementation contract and commands
- `AI_AGENTS.md` — project AI roles and handoff rules
- `AI_OPERATIONS/` — context loading, model routing, token strategy, self-review, memory, and execution rules
- `docs/product/` — product and brand specifications
- `docs/features/` — acceptance-ready vertical slices
- `docs/architecture/decisions/` — architecture decision records
- `docs/security/` — threat models and independent reviews
- `docs/operations/` — deployment and incident runbooks

## License

MIT
