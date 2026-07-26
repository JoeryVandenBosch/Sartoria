# Sartoria Claude Continuation Handoff

Date: 2026-07-26
Repository: `JoeryVandenBosch/Sartoria`
Target branch: `main`
Audit pull request: `#19`

## Read first

1. `AGENTS.md`
2. `CLAUDE.md`
3. `AI_OPERATIONS/AI_PROJECT_MANAGER.md`
4. `AI_AGENTS.md`
5. `README.md`
6. `VISION.md`
7. `ROADMAP.md`
8. `ARCHITECTURE.md`
9. `SECURITY.md`
10. `docs/product/figma-collaboration.md`
11. `docs/reviews/2026-07-26-final-claude-readiness-audit.md`
12. the relevant feature specification and active ADRs

Follow the AIFramework model-routing file rather than guessing which Claude model should perform planning, implementation, review, or high-risk security work.

## Current truth

The private Sartoria MVP is implemented and CI-validated. Do not recreate it.

Completed capabilities:

- owner-scoped wardrobe and wish-list management;
- acquisition cost facts and deterministic wardrobe insights;
- quarantine-first private media with scanning and deletion boundaries;
- private profile and measurement-consent controls;
- manual outfits, revision lifecycle, and explicit wear history;
- explainable recommendations with deterministic fallback;
- deterministic travel planning and packing;
- Better Auth, PostgreSQL repositories, and forced row-level security;
- release environment and rollback gates;
- digest-controlled containerised private staging package;
- segmented edge and internal data networks;
- audited staging owner and isolation-test identity bootstrap;
- live staging health and anonymous-storage verification tooling;
- explicit exclusion of staging secrets and evidence from Git and image contexts.

Public sign-up remains disabled. V1 remains private. Public community, discovery, social feeds, and public wardrobe sharing are not current work.

## Connected Figma capability

The repository owner has Figma connected to Claude.

- Use the connected workspace for meaningful product-flow, component, responsive, interaction, prototype, accessibility, and visual-acceptance work.
- Inspect existing Sartoria files and approved frames before creating or replacing anything.
- Follow `docs/product/figma-collaboration.md`.
- Use synthetic data only and never place private wardrobe data, measurements, email addresses, destinations, credentials, production screenshots, signed URLs, or staging evidence in Figma.
- Do not treat Figma as a runtime dependency or delay non-visual work merely to create mock-ups.
- A Figma frame is not proof of implementation, test completion, deployment, or release approval.
- When Figma is used, record the file, page, section, frame links, status, accessibility decisions, and intentional design-to-code differences in the implementation handoff.
- No canonical Sartoria Figma file URL is recorded yet. Locate the relevant connected file rather than inventing one, then record its exact link in the first handoff that uses it.

## External path

Issue `#17` is the only canonical path to live private staging acceptance. Execute it only with real host, DNS, image-digest, secret-manager, backup, and operator inputs. Never invent or simulate its evidence.

## Immediate coding path

When those external inputs are unavailable, start:

`docs/features/0010-closed-beta-observability.md`

This is the approved first Phase 7B repository-owned vertical slice. It has no meaningful visual dependency, so Figma must not delay implementation.

Execution instruction:

> Continue Sartoria directly from the latest `main`. Do not restart or redesign the project. Implement Feature 0010 as one complete risk-level-3 vertical slice. Inspect existing module, error-handling, configuration, testing, and documentation conventions first. Follow AIFramework model routing and self-review. Keep observability provider-neutral and privacy-safe by construction. Add tests, operations guidance, rollback, security/privacy review, and exact handoff evidence. Commit coherent progress continuously, open a pull request, run the complete GitHub Actions gate, fix concrete failures, review the final diff, and merge only when green. Do not ask for routine approval and do not wait for staging credentials or Figma work.

## Mandatory constraints

- no raw request, response, exception, environment, provider, or domain objects in telemetry;
- no email, user/owner/item identifiers, media keys, signed URLs, file names, notes, measurements, destinations, prompts, tokens, cookies, or passwords;
- no observability SDK in domain modules;
- no external observability provider without ADR, privacy review, security review, and explicit approval;
- sink failure may not break primary user workflows;
- deterministic local and test adapters remain available;
- all behaviour must pass strict schemas and bounded inputs;
- no public community work in private V1.

## Required commands

```bash
npm install --no-audit --no-fund
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Deployment changes additionally require the relevant documented environment plus:

```bash
npm run verify:production-env
npm run verify:staging-images
npm run verify:staging-package
npm run verify:staging
```

## Open pull requests

Dependabot PRs `#1`, `#3`, and `#5` are intentionally outside this handoff. Do not mix them into product or observability work. Handle each through a separate dependency-maintenance branch and full validation gate.

## Completion contract

A Claude change is not complete until:

- acceptance criteria are implemented;
- relevant automated tests pass;
- full CI is green;
- final diff and changed-file list are reviewed;
- architecture, security, privacy, accessibility, and operations implications are recorded;
- Figma evidence and intentional design-to-code differences are recorded when Figma is used;
- migrations and rollback are covered where applicable;
- no external evidence is fabricated;
- an exact next handoff is committed.

## Final audit evidence

Pull request `#19` code-complete validation passed on head `8551a0a53c10ed49fa6135f9b79568ef7977f2f4` in GitHub Actions run `30195729947`.

Passed checks:

- production environment contract;
- immutable staging image positive and negative contract;
- staging environment contract;
- staging package repository integrity;
- segmented Compose configuration;
- lint and strict TypeScript;
- complete unit/application tests;
- production build and standalone artifact;
- complete Chromium end-to-end suite.

The latest `main` is the canonical Claude starting point. The actual merge commit is recorded in PR `#19` and issue `#17`.