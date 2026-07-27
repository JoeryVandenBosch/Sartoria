# Operational observability

Provider-neutral operational events for closed beta. See ADR 0011 for the design rationale and `docs/features/0010-closed-beta-observability.md` for the specification.

## What this gives operators

One JSON object per line on stdout, describing the health of five critical boundaries. Each line answers: what happened, whether it succeeded, how long it took, in which environment and release, and — for a request-scoped operation — which correlation identifier it belongs to.

## What this deliberately does not give operators

You cannot determine which user an event belongs to, what they uploaded, what they own, where they are travelling, or what an AI provider returned. This is by construction, not by configuration: the event schema cannot represent that data. See "Privacy model" below.

There is no way to answer "which account is failing" from telemetry alone. If that is needed for a support case, reproduce the failure with a synthetic account.

## Configuration

| Variable | Values | Default | Purpose |
|---|---|---|---|
| `SARTORIA_OBSERVABILITY_SINK` | `console`, `none` | `console`, or `none` under test | Selects the destination |
| `SARTORIA_DEPLOYMENT_ENV` | `development`, `test`, `staging`, `production`, `unknown` | Derived from `NODE_ENV` | Labels the environment |
| `SARTORIA_RELEASE` | `[A-Za-z0-9._-]{1,64}` | unset | Labels the release |

Unrecognised values fail safe rather than failing closed:

- an unrecognised sink falls back to `console` outside test, never to a network destination;
- an unrecognised environment becomes `unknown` rather than being echoed;
- a release identifier that does not match the pattern is dropped, because a release label is not worth the risk of emitting unvalidated configuration text.

There is no option for an external endpoint. Sink selection is a closed enumeration in code; adding a provider requires a code change and an ADR.

## Event catalogue

Every emittable event and every permitted attribute. Nothing outside this table can be emitted.

### `auth.session.resolved`

Session resolution outcome. Carries no account identity.

| Attribute | Type | Values |
|---|---|---|
| `identitySource` | enum | `development`, `better-auth` |
| `authenticated` | boolean | |
| `failureClassification` | enum | see classifications below |

### `database.readiness.checked`

Readiness probe outcome. Emitted by `GET /api/health/ready`.

| Attribute | Type | Values |
|---|---|---|
| `failureClassification` | enum | see classifications below |

### `media.processing.completed`

Media pipeline outcome. Never a file name, quarantine or private key, signed URL, byte content, scan reference, scanner name, or owner.

| Attribute | Type | Values |
|---|---|---|
| `disposition` | enum | `ready`, `rejected`, `failed`, `skipped` |
| `scanVerdict` | enum | `safe`, `malicious`, `unsupported` |
| `rejectionCode` | enum | `malware-detected`, `unsupported-type` |
| `failureClassification` | enum | see classifications below |

Declared and detected content types are deliberately omitted: they describe the user's file rather than the health of the pipeline.

### `recommendation.generation.completed`

Provenance only. Never the prompt, profile, wardrobe contents, item identifiers, provider name, model name, or provider response.

| Attribute | Type | Values |
|---|---|---|
| `generationSource` | enum | `provider`, `fallback` |
| `fellBackToDeterministic` | boolean | |
| `fallbackReason` | enum | `provider-not-configured`, `provider-failed`, `provider-output-invalid`, `provider-reference-invalid`, `provider-confidence-low` |
| `failureClassification` | enum | see classifications below |

### `staging.identity.bootstrapped`

Counts only. Never an email, digest, identifier, password, token, or operator reference.

| Attribute | Type | Values |
|---|---|---|
| `identitiesCreated` | count | 0 to 86,400,000 |
| `identitiesAlreadyPresent` | count | 0 to 86,400,000 |
| `failureClassification` | enum | see classifications below |

### `observability.sink.failed`

Reserved for the sink-failure path. Never emitted recursively.

### Failure classifications

`configuration`, `dependency-unavailable`, `timeout`, `validation`, `not-authorised`, `not-found`, `conflict`, `unexpected`.

These are derived from the error's constructor name only. Error messages are never read, so a driver that embeds a connection string in its text cannot leak it.

## Envelope

```json
{"schemaVersion":1,"name":"database.readiness.checked","severity":"info","timestamp":"2026-07-27T09:14:22.481Z","environment":"staging","outcome":"success","release":"1.4.2","correlationId":"9f2c...","durationMs":12}
```

Key order is fixed. Optional keys are omitted entirely rather than serialised as `null`. Identical input, timestamp, and correlation identifier produce byte-identical output.

`severity` is `info`, `warning`, or `error`. `outcome` is `success`, `failure`, `degraded`, or `skipped`. Note that these are independent: a recommendation that falls back to the deterministic engine is `info` severity with a `degraded` outcome, because it is a healthy, expected path.

## Correlation identifiers

Sixteen random bytes, hex-encoded. Non-semantic: they encode no account, request, or wardrobe meaning and cannot be reversed into user data. A client-supplied value is never trusted — anything not already exactly server-shaped is replaced with a fresh identifier.

## Retention assumptions

This slice emits to stdout and does not implement retention. It assumes the deployment platform's default container log retention.

Because events contain no personal data, they are not subject to erasure requests and no deletion propagation is required. This is a deliberate property: it is what allows log retention to be an infrastructure concern rather than a privacy one.

If a future ADR introduces an external sink, retention becomes a data-processing decision and must be reviewed then.

## Reading the output

Filter by event name:

```
kubectl logs deploy/sartoria | grep '"name":"media.processing.completed"'
```

Find degraded recommendation generation:

```
kubectl logs deploy/sartoria | jq -c 'select(.name == "recommendation.generation.completed" and .outcome == "degraded")'
```

Trace one request across boundaries:

```
kubectl logs deploy/sartoria | jq -c 'select(.correlationId == "9f2c...")'
```

## Interpreting common signals

**`recommendation.generation.completed` with `fallbackReason: provider-not-configured`** — expected when no AI gateway is configured. Not a fault.

**`fallbackReason: provider-output-invalid` or `provider-reference-invalid`** — the provider returned something that failed schema validation or referenced items outside the user's wardrobe. The deterministic fallback served the user correctly. Sustained occurrence indicates a provider or prompt regression worth investigating.

**`media.processing.completed` with `scanVerdict: malicious`** — the quarantine-first pipeline worked. The object was deleted and never promoted.

**`database.readiness.checked` with `failureClassification: configuration`** — `DATABASE_URL` is missing or invalid. Distinguishes a deployment error from an outage, which `dependency-unavailable` indicates.

**`auth.session.resolved` with `authenticated: false`** — normal for anonymous traffic hitting a protected route; the user was redirected to sign-in. Only a concern in volume.

## Sink failure

If a sink fails, one bounded line is written to stderr:

```
sartoria observability sink failed: dependency-unavailable
```

This is not an operational event and never re-enters the sink. Seeing this line means telemetry was lost; it does not mean a user request failed. User workflows are unaffected by sink failure under all conditions, which is verified by test.

## Rollback

Ordered from least to most invasive. Prefer the earliest that resolves the problem.

**1. Disable emission.** Set `SARTORIA_OBSERVABILITY_SINK=none` and restart. Instrumentation remains in place; nothing is emitted. No code change, no deployment, immediately reversible.

**2. Revert one boundary.** If a single event is operationally noisy, remove that `emit` call. Emission is side-effect-only: no boundary's control flow, response body, status code, thrown error, or domain state depends on it. Keep the interface and its tests.

**3. Revert the slice.** Remove `src/lib/observability`, `tests/observability`, and the five boundary call sites. No database schema, migration, or domain state is involved, so there is nothing to unwind.

**Never roll back by broadening payloads or logging raw objects.** If an event lacks the detail needed to diagnose an incident, add a bounded attribute to the catalogue under review. Reaching for an unstructured log defeats the privacy model this slice exists to provide.

## Privacy model

The guarantee is structural. An attribute value may only be a boolean, a bounded non-negative integer, or a member of a declared enumeration, so free-form strings are not representable anywhere in the schema.

Verified by test: twelve categories of forbidden content — email addresses, user identifiers, media keys, signed URLs, file names, prompts, measurements, travel destinations, passwords, bearer tokens, exception text, and stack traces — are offered to the schema and refused, both as enum values and under undeclared keys. A catalogue-wide assertion proves no attribute anywhere accepts free text.

Two executable architecture guards run in CI: no file under any module's `domain` folder may reference `lib/observability`, and no source file may import a third-party telemetry SDK.

All tests use synthetic data only.
