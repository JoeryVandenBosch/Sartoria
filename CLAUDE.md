# Sartoria Implementation Contract

Read `AGENTS.md`, `AI_AGENTS.md`, `README.md`, `VISION.md`, `ARCHITECTURE.md`, active ADRs, and the relevant feature specification before editing.

## Implementation rules

- Build complete, acceptance-ready vertical slices.
- Preserve the modular-monolith boundaries in `ARCHITECTURE.md`.
- Keep domain logic independent from Next.js, database, storage, analytics, and AI provider SDKs.
- Use TypeScript strict mode and avoid untyped escape hatches.
- Validate all external input at the transport boundary.
- Treat AI output as untrusted external input and schema-validate it.
- Keep wardrobe images and personal profile data private by default.
- Do not log images, measurements, prompt payloads, secrets, or personal wardrobe content.
- Make primary wardrobe and outfit workflows usable without a successful AI call.
- Add tests, accessibility coverage, documentation, and observability with behaviour.
- Never invent missing product rules, credentials, integrations, or user consent.
- Create an ADR for material technology, dependency, persistence, or boundary decisions.
- Require independent review for risk levels 3 and 4.

## Initial commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

These commands become mandatory once the application scaffold is committed. Keep this file and `.ai/readiness.json` aligned when commands change.

## Completion evidence

A change is complete when acceptance criteria are met, relevant tests pass, affected documentation is current, security and privacy implications are addressed, and no unresolved placeholder or silent assumption remains.
