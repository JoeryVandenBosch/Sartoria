# Sartoria Claude Implementation Contract

Read `AGENTS.md`, `AI_OPERATIONS/AI_PROJECT_MANAGER.md`, `AI_AGENTS.md`, `README.md`, `VISION.md`, `ROADMAP.md`, `ARCHITECTURE.md`, active ADRs, the latest handoff in `docs/handoffs/`, and the relevant feature specification before editing.

## Execution mode

- Work directly in `JoeryVandenBosch/Sartoria` from the latest `main` branch.
- Inspect current code, open pull requests, issues, migrations, and recent commits before creating anything.
- Continue the existing implementation. Do not restart, redesign, replace, or duplicate completed modules.
- Take the lead on routine engineering decisions that are already covered by repository architecture and product rules.
- Do not request approval for every file or commit. Ask only when blocked by missing credentials, an irreversible external action, or a genuinely unresolved high-impact product decision.
- Use a branch and pull request, commit coherent progress continuously, run CI, fix concrete failures, review the final diff, and merge only when the required gate is green.
- Never claim validation, deployment, or external infrastructure evidence that was not actually produced.

## Product constraints

- V1 remains private and invitation-controlled. Public community, social discovery, and public wardrobe sharing stay in the backlog.
- Preserve the premium crown-based Italian-chic direction and the slogan **Elegantia in Simplicitate**.
- Keep the application English-first unless an approved localisation slice changes that boundary.
- Preserve privacy, owner isolation, explainability, accessibility, deterministic fallbacks, and provider-neutral AI integration.
- Primary wardrobe, outfit, planning, and insight workflows must remain usable without an AI provider.

## Implementation rules

- Build the smallest complete, acceptance-ready vertical slice.
- Preserve the modular-monolith boundaries in `ARCHITECTURE.md`.
- Keep domain logic independent from Next.js, database, storage, analytics, and AI-provider SDKs.
- Use TypeScript strict mode and avoid untyped escape hatches.
- Validate all external input at the transport boundary.
- Treat AI output as untrusted external input and schema-validate it.
- Keep wardrobe images, style profiles, travel context, wear history, recommendations, and staging evidence private by default.
- Do not log images, measurements, prompt payloads, secrets, passwords, bearer tokens, fit notes, private wardrobe content, or presigned URLs.
- Add tests, accessibility coverage, documentation, observability, rollback guidance, and migration evidence with behaviour.
- Never invent missing product rules, credentials, integrations, infrastructure evidence, or user consent.
- Create an ADR for material technology, dependency, persistence, authentication, provider, infrastructure, or boundary decisions.
- Run `AI_OPERATIONS/SELF_REVIEW_PROTOCOL.md` before delivery.
- Require independent review for risk levels 3 and 4. Risk level 4 requires explicit human release approval.

## Current repository state

The private MVP is implemented and CI-validated:

- owner-scoped wardrobe and wish-list records;
- acquisition cost facts and deterministic wardrobe insights;
- quarantine-first private media and malware-scanning boundaries;
- private style profile with consent-controlled measurements;
- manual outfits, revisions, deletion, and explicit date-only wear history;
- explainable recommendations with strict provider validation and deterministic fallback;
- deterministic travel planning and packing;
- PostgreSQL persistence with forced row-level security;
- Better Auth with public sign-up disabled;
- staging-only audited bootstrap for the owner and isolation-test identities;
- standalone non-root container, HTTPS edge, PostgreSQL, private object storage, ClamAV, migrations, health probes, and staging verification tooling.

The repository is ready for continued coding. A live staging environment is not yet accepted until external provisioning and every checkbox in issue `#17` are complete.

## Next-action rule

1. Read the latest Claude-readiness handoff in `docs/handoffs/`.
2. When approved infrastructure credentials and a host are available, execute issue `#17` exactly through the staging runbook.
3. When external infrastructure is unavailable, continue the next repository-owned closed-beta readiness slice from `ROADMAP.md`; do not wait or redesign the product.
4. Keep public community and discovery features out of V1.

## Commands

```bash
npm install --no-audit --no-fund
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run validate
```

Deployment-only commands:

```bash
npm run verify:production-env
npm run verify:staging
npm run db:auth:migrate
npm run db:migrate
```

Deployment-only commands require the documented environment and must not be simulated with invented values outside CI fixtures. Keep this file, `package.json`, CI, `.ai/readiness.json`, runbooks, and roadmap aligned when commands or boundaries change.

## Completion evidence

A change is complete only when acceptance criteria are met, relevant validation passes, affected documentation is current, security and privacy implications are addressed, migrations and rollback are covered, the final diff is reviewed, unresolved risks are explicit, and the exact next action is recorded.