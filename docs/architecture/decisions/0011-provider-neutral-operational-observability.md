# ADR 0011 — Provider-neutral operational observability boundary

## Status

Accepted for implementation.

## Context

Sartoria enters closed beta without operational visibility. Operators cannot currently tell whether a failed request was caused by configuration, an unavailable dependency, or a rejected upload, and cannot correlate a failure with a release.

The obvious remedy — adding a logging or tracing library and calling it where problems occur — is unacceptable here for three reasons.

First, `ARCHITECTURE.md` forbids domain modules from importing analytics SDKs, and an SDK adopted at call sites spreads quickly into exactly those modules.

Second, Sartoria's data is unusually sensitive for its size. A single wardrobe record can reveal what someone owns, what it cost, what they think of their own body, and where they are travelling. Conventional structured logging encourages passing an error or a request object and letting the library decide what to serialise, which is precisely how measurements, destinations, media keys, and signed URLs reach a log aggregator.

Third, no observability vendor has been selected. Committing to a provider's data model now would make the eventual choice expensive to reverse.

A privacy guarantee maintained by reviewer diligence at every future call site will fail eventually. The question this ADR settles is where the boundary lives and how the guarantee is enforced.

## Decision

Introduce a provider-neutral observability boundary owned by the shared library at `src/lib/observability`, with privacy enforced by the type system rather than by convention.

**Placement.** `ARCHITECTURE.md` limits shared code to "stable primitives such as identifiers, time, money, result types, and audit metadata". An operational event envelope is audit metadata: it is a bounded value type with no domain behaviour, and it is consumed by every module. Placing it in a feature module would invert the dependency direction, because transport and infrastructure would then depend on a domain module for a cross-cutting primitive.

**Allow-listed catalogue.** Event names and per-event attribute keys are declared in a single catalogue. An attribute value may only be a boolean, a bounded non-negative integer, or a member of a declared enumeration. Free-form strings are not representable, so an email address, user identifier, media key, signed URL, prompt, measurement, destination, token, or exception message cannot be expressed by the schema even by an author who wants to. The catalogue is the reviewable surface: adding a field is a deliberate change to one file.

**Emitter contract.** Application code depends on a single interface with one method. `emit` returns `void` and never throws, so a caller cannot await telemetry, branch on its result, or be interrupted by it. Failure containment is layered: invalid events are dropped during construction, synchronous sink throws are caught, and asynchronous rejections are observed so no unhandled rejection can reach the process. Every failure path terminates at a local signal that writes one bounded line to stderr and never re-enters the sink.

**Dependency style.** Transport and infrastructure entry points resolve a process-wide emitter. Application use cases receive an emitter through their existing dependency parameter, defaulting to a null implementation. Use cases therefore stay pure, remain testable without observability configuration, and never reach for global state.

**Closed sink selection.** Configuration selects between `console` and `none`. There is deliberately no `http`, `otlp`, or vendor option. Adding an external destination requires a code change and a further ADR, so no environment variable can cause telemetry to leave the deployment.

**Error handling.** Failures are classified from the error's constructor name into a bounded enumeration. Messages are never read. A driver that embeds a connection string or credential in its error text therefore cannot leak it into an event.

## Alternatives considered

**Adopt OpenTelemetry now.** `ARCHITECTURE.md` names OpenTelemetry-compatible signals as the direction, and this remains the likely destination. It is rejected for this slice because it requires selecting a collector and exporter before closed beta, introduces a semantic-conventions model whose attributes are free-form strings by default, and would put an SDK on the dependency path of application modules before the privacy model is proven. The envelope defined here maps cleanly onto OpenTelemetry attributes later; the allow-list is the part worth keeping.

**Structured logging with a redaction layer.** Rejected because redaction is a denylist. It protects against the field shapes someone anticipated and fails silently against the ones they did not, and it cannot be verified by a test that proves the absence of a category of data. The allow-list inverts this: the failure mode of forgetting to declare a field is a dropped event, not a leak.

**Instrument inside domain modules for richer context.** Rejected as a direct violation of the dependency rules, and unnecessary: every fact operators need at these five boundaries is available at the application or transport layer.

## Consequences

- Adding an event or attribute requires editing the catalogue, which makes privacy review tractable but adds friction to ad-hoc debugging. This is the intended trade.
- Operators cannot answer "which user hit this error" from telemetry. That is a deliberate limitation of a system holding wardrobe data; correlation identifiers support tracing a single request without identifying its owner.
- Bounded classifications are coarser than exception messages. Diagnosis of a novel failure may require reproducing it rather than reading a log.
- Two executable architecture guards enforce the boundary in CI: no file under any module's `domain` folder may reference `lib/observability`, and no source file may import a third-party telemetry SDK.
- The no-op sink is the documented rollback path. Emission can be disabled entirely by configuration without removing instrumentation or altering domain behaviour.
- A future provider adapter is additive: it implements the existing sink interface and requires no change to any boundary.
