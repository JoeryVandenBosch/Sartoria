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
- Private object storage for wardrobe imagery
- Provider-neutral AI integration layer
- Responsive, accessible premium interface

## Delivery status

The engineering foundation and first wardrobe item vertical slice are complete and validated. Production identity and PostgreSQL persistence are now being connected before private wardrobe media is introduced.

Local development deliberately uses explicit development identity and in-memory persistence adapters. Production modes fail closed when required database and authentication configuration is absent.

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

Database setup and migration instructions live in `migrations/README.md`.

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

## License

MIT
