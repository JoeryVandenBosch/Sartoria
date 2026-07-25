# Sartoria Implementation Contract

Read `AGENTS.md`, `AI_OPERATIONS/AI_PROJECT_MANAGER.md`, `AI_AGENTS.md`, `README.md`, `VISION.md`, `ROADMAP.md`, `ARCHITECTURE.md`, active ADRs, and the relevant feature specification before editing.

## Implementation rules

- Build complete, acceptance-ready vertical slices.
- Preserve the modular-monolith boundaries in `ARCHITECTURE.md`.
- Keep domain logic independent from Next.js, database, storage, analytics, and AI provider SDKs.
- Use TypeScript strict mode and avoid untyped escape hatches.
- Validate all external input at the transport boundary.
- Treat AI output as untrusted external input and schema-validate it.
- Keep wardrobe images and personal profile data private by default.
- Do not log images, measurements, prompt payloads, secrets, fit notes, or personal wardrobe content.
- Make primary wardrobe and outfit workflows usable without a successful AI call.
- Add tests, accessibility coverage, documentation, and observability with behaviour.
- Never invent missing product rules, credentials, integrations, or user consent.
- Create an ADR for material technology, dependency, persistence, authentication, provider, or boundary decisions.
- Run `AI_OPERATIONS/SELF_REVIEW_PROTOCOL.md` before delivery.
- Require independent review for risk levels 3 and 4.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run validate
```

These commands are mandatory for the committed application scaffold. Keep this file, `package.json`, CI, and `.ai/readiness.json` aligned when commands change.

## Current development boundary

The first wardrobe slice uses explicit development identity and in-memory persistence adapters. They are isolated behind application interfaces and must not be treated as production authentication or persistence. Production adapters require separate ADRs and security review.

## Completion evidence

A change is complete when acceptance criteria are met, relevant tests pass, affected documentation is current, security and privacy implications are addressed, validation results are recorded honestly, and no unresolved placeholder or silent assumption remains.
