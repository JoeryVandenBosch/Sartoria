# Handoff — closed beta observability (Feature 0010)

**Date:** 2026-07-27
**Branch:** `feat/0010-closed-beta-observability`
**Base:** `9c508fd` (contains audited baseline `7da3db7`)
**Risk level:** 3
**Model tier:** deep (Claude Opus 5), per `AI_OPERATIONS/MODEL_SELECTION.md` — architecture decision, security- and privacy-critical reasoning, and risk level 3

## What was delivered

One complete vertical slice implementing `docs/features/0010-closed-beta-observability.md`: a provider-neutral observability boundary with privacy enforced by the type system, three sink adapters, instrumentation at five critical boundaries, 76 new tests, an ADR, operations guidance, and a security and privacy review.

## Commits

| Commit | Summary |
|---|---|
| `f0172e8` | Event model, envelope builder, correlation identifiers |
| `dba12dc` | Emitter interface, three adapters, runtime sink selection |
| `01741dd` | 68 foundation tests |
| `2471a7e` | Instrumentation at five boundaries |
| `184efa0` | Boundary emission tests and executable architecture guards |
| `24aadfb` | Lint fix: shadowed `module` variable |
| `7f8bf65` | ADR 0011, operations guidance, security review |
| `9e39dce` | Reuse `SARTORIA_DEPLOYMENT_ENV` instead of a new variable |
| `848a263` | This handoff |
| `e619116` | Fixes for review findings H1, H2, M1–M4, L6 |
| `843ca0e` | Auth boundary tests and staging variables (L1, L3) |

35 files changed, 3,093 insertions, 16 deletions.

> **Corrected after independent review.** This record previously stated base `849cce8`, eight commit SHAs that do not appear in the pull request, and "21 files changed, 2,238 insertions". None matched the branch. `AI_AGENTS.md` §"Handoff contract" requires commits and files changed to match, and the earlier figures predated both a rebase onto current `main` and the review fixes.

## Architecture decisions

Recorded in full in `docs/architecture/decisions/0011-provider-neutral-operational-observability.md`.

1. **The boundary lives in `src/lib/observability`.** `ARCHITECTURE.md` permits shared code for "audit metadata"; an event envelope is a bounded value type with no domain behaviour, consumed by every module. Placing it in a feature module would invert the dependency direction.
2. **Privacy is enforced by the type system, not redaction.** Attribute values may only be boolean, bounded count, or declared enum. Free-form strings are not representable. Redaction was rejected because it is a denylist that fails silently against unanticipated shapes.
3. **`emit` returns `void` and never throws.** A caller cannot await telemetry or branch on its result, so no user workflow can couple to sink health.
4. **Sink selection is a closed enumeration** (`console`, `none`). No configuration value can cause telemetry egress; adding a provider requires a code change and an ADR.
5. **Application use cases receive an injected emitter**, defaulting to a null implementation. Only transport and infrastructure resolve the shared emitter, so use cases stay pure and no module reaches global state.

## Product decisions

- No behavioural, analytics, or product-usage events. Operational health only.
- Operators cannot identify which user an event belongs to. Deliberate for a system holding wardrobe data; correlation identifiers trace a request without identifying its owner.
- Public sign-up unchanged and disabled. No community, social, public wardrobe, discovery, marketplace, or advertising functionality introduced.

## Security and privacy review

Full document: `docs/security/reviews/2026-07-27-closed-beta-observability.md`. Seven threats assessed with mitigations and verification references. No field in the envelope is personal data, so events are out of scope for erasure requests.

Two non-blocking low findings: generic numeric bounds on identity counts (L1), and retention inherited from the platform rather than asserted by the application (L2).

**This is implementer self-review. Independent review is required at risk level 3 and remains outstanding.**

## Validation

| Command | Result |
|---|---|
| `npm install --no-audit --no-fund` | pass |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm test` | pass — 33 files, 186 tests (baseline was 30 files, 110 tests) |
| `npm run build` | pass |
| `npx playwright install --with-deps chromium` | **blocked locally** — `cdn.playwright.dev` outside the sandbox network allowlist |
| `npm run test:e2e` | 8/8 pass under a locally shimmed browser; see caveat |
| `npm run verify:production-env` | fails — pre-existing, requires staging credentials |
| `npm run verify:staging-images` | fails — pre-existing, requires staging credentials |
| `npm run verify:staging-package` | pass |

**E2E caveat.** The sandbox has Chromium build 1194 while the installed Playwright expects 1228, and the download host is not reachable. E2E was run against a local symlink shim; nothing in the repository was modified to achieve this. Under the shim, results were unstable across runs (main: 1 failure; branch run 1: 3 failures; branch runs 2 and 3: fully green), which is consistent with a version-mismatched browser rather than a regression. **GitHub Actions performs the real browser install and is the authoritative E2E result.**

**Verifier caveat.** `verify:production-env` and `verify:staging-images` fail identically on `origin/main`. They require staging credentials tracked separately in issue #17.

## Corrections made during implementation

- Introduced `SARTORIA_DEPLOYMENT_ENVIRONMENT` before discovering the repository already uses `SARTORIA_DEPLOYMENT_ENV`. Corrected in `1eda0b4` to reuse the existing variable rather than create a near-duplicate.
- Media event attributes initially used invented vocabulary (`clean`, `infected`). Realigned to the media domain's actual terms (`safe`, `malicious`, `unsupported`).
- A lint error was briefly masked by an unconditional shell `echo` after an `eslint` invocation and was committed before being caught. Fixed in `a745e58`.

## Remaining risks

1. **Independent review outstanding.** Blocking for risk level 3 per `AI_AGENTS.md`. Should be a fresh session at deep tier, not the implementing agent.
2. **E2E not verified against a correctly matched browser locally.** CI is authoritative and must be green before merge.
3. **Deployment verifiers unverified.** Pre-existing; unblocked only by issue #17.
4. **L2, L4 and L5 remain open.** The pre-scan path in `processWardrobeMedia` still emits nothing on a repository failure; there is no volume note for `auth.session.resolved`, which fires at `info` severity on every one of the twenty `getCurrentUserId()` call sites with `console` as the production default and no sampling; and a separate issue records that `rejectAndDelete` failures bypass the `catch` and strand media in `scanning`.

5. **No sink failure has been observed in a real deployment.** Containment is proven by test but not by production experience.
5. **Correlation identifiers group one operation, not one request.** Every boundary generates an identifier per invocation. Propagating one across the boundaries touched by a single HTTP request needs request-scoped context, which this slice does not implement, so two events from the same page load carry different identifiers. The runbook states this.

> **Corrected after independent review.** This item previously read "generated but not yet propagated… each boundary currently generates independently". The second half is now true; the first half was misleading, because before the fix no boundary generated an identifier at all (finding H2).

## Environment integrity note

During this work, unauthored source files appeared twice in the agent's sandbox working tree, implementing the same feature. They were never committed or pushed; they were quarantined with a timestamped manifest and reported to the repository owner. Every file in this branch was verified as agent-authored via `git show --stat` per commit and a full `git diff origin/main` authorship review before the pull request. No repository-side activity was involved: the phantom code appears in zero commits across all refs, and the GitHub event log shows no third-party pushes.

## Corrections after independent review

PR #23 underwent independent risk-level-3 review, which found **two high, four medium, and six low**. The report is at `reviews/pr-23-closed-beta-observability-independent-review.md`.

| Finding | Summary |
|---|---|
| H1 | Three of the five instrumented boundaries emitted nothing in any deployed environment. The emitter was optional and no composition root passed one; tests passed because they injected one directly. Fixed by making the dependency required, so `tsc` is the guard. |
| H2 | Correlation identifiers were implemented, documented in the runbook, and never used. No boundary set one and neither generator had a call site. Every boundary now generates one per invocation; the unused `resolveCorrelationId` was removed. |
| M1 | Validation inspected own enumerable properties while the envelope builder read through the prototype chain, so an inherited or prototype-polluted attribute passed validation and reached the sink as free text. Both sides now agree on own properties only. |
| M2 | Media rejection events were emitted before the rejection persisted, so a storage failure produced an event asserting a transition that never happened. They now fire from the fulfilment handler. |
| M3 | Emission sat inside control-flow-bearing `try` blocks, where a telemetry fault would have turned a healthy readiness probe into a 503 or persisted a media record as failed. Both terminal emits now sit outside. |
| M4 | The console sink wrote to stdout with no error listener. A broken log pipe surfaces as an asynchronous stream error that escapes every try/catch and reaches `uncaughtException`. Both process streams are now guarded. |
| L1 | The auth boundary, which runs on every page load, had no tests. Six added, including the containment test the security review needed. |
| L3 | New variables were absent from the staging deployment. Added, with a runbook note that an empty `SARTORIA_RELEASE` silently drops the field. |
| L6 | Inherited keys produced the wrong rejection reason. Fixed alongside M1. |

**L2, L4 and L5 remain open.** See remaining risks.

**The fix commits have not themselves been independently reviewed.** The same reviewer wrote both the review and the patch, so `AI_AGENTS.md` item 6 is not satisfied for the fix diff. Risk level 3 routing applies to it. This blocks merge.

## Exact next action

Open the pull request, confirm the complete GitHub Actions gate is green, obtain independent risk-level-3 review, then merge. Do not merge on the strength of local validation alone.

Do not mix Dependabot pull requests #1, #3, #5, or the newer `better-auth` bump into this branch.
