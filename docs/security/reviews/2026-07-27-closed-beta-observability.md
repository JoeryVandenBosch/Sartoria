# Security and privacy review — closed beta observability

**Feature:** `docs/features/0010-closed-beta-observability.md`
**ADR:** `docs/architecture/decisions/0011-provider-neutral-operational-observability.md`
**Risk level:** 3
**Date:** 2026-07-27
**Reviewer:** implementing agent (Claude, deep tier)

> This is implementer self-review. `AI_AGENTS.md` requires independent review at risk level 3; that review is outstanding and is recorded as a blocking item in the handoff. This document exists to make that review cheap, not to substitute for it.

## Scope

Adds operational event emission at five boundaries. The emitter is a **required** dependency on all three application use cases, and every composition root supplies it, so all five boundaries emit in a deployed environment. No change to authentication, authorisation, data model, migrations, storage, or any user-facing behaviour.

> **Corrected after independent review.** The original text claimed emission at five boundaries. That was true of the code and false of the deployment: the emitter was optional and no composition root passed one, so three of the five boundaries emitted nothing anywhere (finding H1). Making the dependency required turns `tsc` into the guard.

## Threat model

### T1 — Private user data reaches operational output

**Severity:** high. Wardrobe data reveals possessions, spending, body measurements, and travel plans.

**Mitigation, structural, in two layers.** First, the type system constrains attribute values to boolean, bounded non-negative integer, or a member of a declared enumeration, so free-form strings are not representable at compile time. Second, validator and envelope builder share an own-property discipline: both inspect only own enumerable properties, so a value that was never validated cannot be copied into an envelope.

> **Corrected after independent review.** The original text claimed an author could not express forbidden content "even deliberately". That was a compile-time guarantee only. At runtime, validation inspected own enumerable properties while the builder read through the prototype chain, so an inherited or prototype-polluted attribute passed validation and was serialised verbatim — reproduced with a real email address and a `postgres://` credential string (finding M1). The second layer above is the fix.

**Residual risk.** A future maintainer could add a free-text attribute to the catalogue. Mitigated by a test that walks the entire catalogue and asserts every attribute is of kind `boolean`, `count`, or `enum`; adding a free-text field fails CI.

**Verification.** `tests/observability/operational-event.test.ts` — twelve forbidden-content categories refused as enum values and under undeclared keys, plus prototype-carried and `Object.prototype`-polluted attributes. `tests/observability/boundary-instrumentation.test.ts` covers the recommendation, staging, and media boundaries; `tests/observability/auth-boundary.test.ts` covers auth. The readiness boundary emits no attributes other than a bounded classification.

> **Corrected after independent review.** The original text implied boundary output was asserted clean across boundaries. Only two of five had boundary tests (finding L1). Media coverage was added with the fix commit, auth in the follow-up.

### T2 — Exception content leaks through error handling

**Severity:** high. Database drivers and HTTP clients routinely embed connection strings, credentials, and request URLs in error messages.

**Mitigation.** Failures are classified from the error's constructor name only. No code path reads `error.message`, `error.stack`, or `error.cause` into an event. Classification is a closed enumeration of eight values.

**Verification.** A gateway throwing `openai: 429 rate limited for account acct_9182` produces an event asserted to contain neither the vendor name, the account identifier, nor the message text.

### T3 — Telemetry egress to an unapproved destination

**Severity:** high. A misconfigured endpoint would export operational data outside the deployment.

**Mitigation.** Sink selection is a closed two-value enumeration (`console`, `none`) in code. No `http`, `otlp`, or vendor option exists. An unrecognised value falls back to `console`, never to a network sink. No source file imports a telemetry SDK, enforced by test.

**Residual risk.** None by configuration. Adding an external sink requires a code change and a further ADR.

### T4 — Telemetry failure degrades user workflows

**Severity:** medium. A synchronous throw or unobserved rejection in an emission path could break a request or crash the process.

**Mitigation.** `emit` returns `void` and never throws. Containment is layered in four parts: invalid events dropped at construction, synchronous throws caught, asynchronous rejections observed via an attached handler, and asynchronous stream errors absorbed by a guard installed on both process output streams (`src/lib/observability/process-stream-guard.ts`). A failure signal that itself throws is also caught. The signal writes one bounded line to stderr and never re-enters the sink, so a failing sink cannot recurse.

> **Corrected after independent review.** The original text named three layers and claimed telemetry could not interrupt a workflow "under any condition". It omitted the failure mode of the only production sink: a broken stdout pipe surfaces as an asynchronous stream `error` event, which escapes `emit`'s try/catch entirely and reaches `uncaughtException` (finding M4). The fourth layer is the fix. Note that emission at two call sites also sat inside control-flow-bearing `try` blocks, where a telemetry fault would have turned a healthy readiness probe into a 503 or persisted a media record as failed (finding M3); both emits now sit outside those blocks.

**Verification.** Tested at the unit level and at a real boundary: a recommendation is produced successfully with a sink configured to throw.

### T5 — Correlation identifiers become a tracking vector

**Severity:** medium.

**Mitigation.** Sixteen random bytes, hex-encoded, non-semantic, generated per boundary invocation. No boundary accepts a client-supplied identifier. If one ever does, it must validate the candidate with `isCorrelationId` and generate a fresh identifier on any mismatch. Identifiers are not persisted and not linked to accounts.

> **Corrected after independent review.** The original text described `resolveCorrelationId`, a helper that had no call site anywhere and has since been removed. More seriously, no boundary generated an identifier at all, so this mitigation described a control that did not exist and the runbook documented a tracing procedure that could not work (finding H2). Every boundary now generates one per invocation.

### T6 — Observability coupling reaches domain modules

**Severity:** medium. Violates `ARCHITECTURE.md` and would spread an eventual vendor SDK into the domain.

**Mitigation.** Application use cases receive an injected emitter defaulting to a null implementation; only transport and infrastructure resolve the shared emitter. Two executable guards in CI: no domain file may reference `lib/observability`, and no source file may import OpenTelemetry, Sentry, Datadog, New Relic, pino, winston, or PostHog.

**Verification.** Both guards were confirmed non-vacuous by injecting a real violation into `src/modules/wardrobe/domain/wardrobe-item.ts`, observing CI failure, and reverting.

### T7 — Log injection via emitted values

**Severity:** low.

**Mitigation.** All values are JSON-encoded through `JSON.stringify`, and no value originates from user input — every attribute is a literal from a declared enumeration or a computed count. Newline injection is not reachable.

## Data classification

| Field | Classification | Justification |
|---|---|---|
| `schemaVersion`, `name`, `severity`, `outcome`, `environment` | non-personal | fixed vocabulary |
| `timestamp` | non-personal | server clock |
| `release` | non-personal | pattern-validated deployment label |
| `correlationId` | pseudonymous, ephemeral | random, unlinked, not persisted. Groups the events of a single operation; not propagated across boundaries within one request |
| `durationMs` | non-personal | bounded integer |
| `attributes` | non-personal | booleans, counts, declared enums only |

No field is personal data. Events are therefore out of scope for erasure requests, and no deletion propagation is required.

## Compliance notes

- **Data minimisation.** Only facts required to assess boundary health are emitted.
- **Purpose limitation.** Operational health only. No behavioural, analytics, or product-usage events, consistent with the feature's out-of-scope list.
- **Retention.** Not implemented in this slice; platform default container log retention applies. Acceptable because no personal data is present. An external sink would make retention a data-processing decision requiring review.
- **Public sign-up.** Unchanged and disabled.
- **Out-of-scope confirmations.** No community, social, public wardrobe, discovery, marketplace, or advertising functionality is introduced.

## Secrets handling

No secret, token, cookie, header, request body, or response body is read or emitted anywhere in this slice. The staging bootstrap boundary emits counts only and does not touch the bearer token, passwords, email addresses, or the email digests already present in that flow.

## Findings

**Superseded by independent review.** This section originally read "No high or medium findings". Independent risk-level-3 review of PR #23 raised **two high and four medium**, recorded in `reviews/pr-23-closed-beta-observability-independent-review.md`:

| Finding | Summary | Status |
|---|---|---|
| H1 | three of five boundaries emitted nothing in any deployed environment | fixed |
| H2 | correlation identifiers implemented, documented, never used | fixed |
| M1 | free text could reach a sink through the prototype chain | fixed |
| M2 | media rejection events asserted a transition that had not persisted | fixed |
| M3 | emission sat inside control-flow-bearing `try` blocks | fixed |
| M4 | containment did not cover the only production sink's actual failure mode | fixed |

Of the six low findings, L1 and L3 are fixed. **L2, L4 and L5 remain open**: the pre-scan path in `processWardrobeMedia` still emits nothing on a repository failure; there is no volume note for `auth.session.resolved`, which fires on every page load; and the handoff metadata was stale, now corrected.

The fix commits have **not** themselves been independently reviewed.

**Low — L1.** The `identitiesCreated` and `identitiesAlreadyPresent` counts share the generic bound of 86,400,000 while realistically never exceeding 2. Harmless, since a count cannot carry content, but a tighter per-attribute bound would express intent more precisely. Not blocking; recorded for a future refinement.

**Low — L2.** Retention is inherited from the platform rather than asserted by the application. Acceptable while output contains no personal data; must be revisited if an external sink is ever introduced.

## Conclusion

The privacy guarantee is structural rather than procedural: forbidden data is unrepresentable in the schema, not merely absent from current call sites. The failure-containment guarantee is likewise structural, since `emit` cannot throw or be awaited.

Recommended for independent review. No blocking security or privacy defect identified.
