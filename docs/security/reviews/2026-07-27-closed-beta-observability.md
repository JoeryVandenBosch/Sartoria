# Security and privacy review — closed beta observability

**Feature:** `docs/features/0010-closed-beta-observability.md`
**ADR:** `docs/architecture/decisions/0011-provider-neutral-operational-observability.md`
**Risk level:** 3
**Date:** 2026-07-27
**Reviewer:** implementing agent (Claude, deep tier)

> This is implementer self-review. `AI_AGENTS.md` requires independent review at risk level 3; that review is outstanding and is recorded as a blocking item in the handoff. This document exists to make that review cheap, not to substitute for it.

## Scope

Adds operational event emission at five boundaries. No change to authentication, authorisation, data model, migrations, storage, or any user-facing behaviour.

## Threat model

### T1 — Private user data reaches operational output

**Severity:** high. Wardrobe data reveals possessions, spending, body measurements, and travel plans.

**Mitigation, structural.** Attribute values are constrained by the type system to boolean, bounded non-negative integer, or a member of a declared enumeration. Free-form strings are not representable. An author cannot express an email address, identifier, media key, signed URL, prompt, measurement, or destination even deliberately.

**Residual risk.** A future maintainer could add a free-text attribute to the catalogue. Mitigated by a test that walks the entire catalogue and asserts every attribute is of kind `boolean`, `count`, or `enum`; adding a free-text field fails CI.

**Verification.** `tests/observability/operational-event.test.ts` — twelve forbidden-content categories refused as enum values and under undeclared keys. `tests/observability/boundary-instrumentation.test.ts` — serialised boundary output asserted not to contain a supplied destination, free-text note, owner identifier, item identifier, colour, email, password, or operator reference.

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

**Mitigation.** `emit` returns `void` and never throws. Containment is layered: invalid events dropped at construction, synchronous throws caught, asynchronous rejections observed via an attached handler. A failure signal that itself throws is also caught. The signal writes one bounded line to stderr and never re-enters the sink, so a failing sink cannot recurse.

**Verification.** Tested at the unit level and at a real boundary: a recommendation is produced successfully with a sink configured to throw.

### T5 — Correlation identifiers become a tracking vector

**Severity:** medium.

**Mitigation.** Sixteen random bytes, hex-encoded, non-semantic, server-generated per operation. A client-supplied value is never trusted: anything not exactly server-shaped is replaced. Identifiers are not persisted and not linked to accounts.

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
| `correlationId` | pseudonymous, ephemeral | random, unlinked, not persisted |
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

No high or medium findings.

**Low — L1.** The `identitiesCreated` and `identitiesAlreadyPresent` counts share the generic bound of 86,400,000 while realistically never exceeding 2. Harmless, since a count cannot carry content, but a tighter per-attribute bound would express intent more precisely. Not blocking; recorded for a future refinement.

**Low — L2.** Retention is inherited from the platform rather than asserted by the application. Acceptable while output contains no personal data; must be revisited if an external sink is ever introduced.

## Conclusion

The privacy guarantee is structural rather than procedural: forbidden data is unrepresentable in the schema, not merely absent from current call sites. The failure-containment guarantee is likewise structural, since `emit` cannot throw or be awaited.

Recommended for independent review. No blocking security or privacy defect identified.
