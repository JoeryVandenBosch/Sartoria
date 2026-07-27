# Feature 0011 — Bounded rate limiting

## Status

Approved as the second Phase 7B implementation slice, following Feature 0010.

## Objective

Protect owner-scoped workflows, authentication, and internal endpoints from abuse and accidental overload, using a provider-neutral interface with deterministic local adapters, without degrading legitimate private use and without introducing a shared external dependency before one is approved.

## User and operator outcome

- A person using Sartoria normally never encounters a limit.
- Credential guessing against sign-in becomes materially more expensive.
- A single owner cannot exhaust media, recommendation, or export capacity for the deployment.
- Internal endpoints remain protected even if a token leaks, because a leaked token alone no longer grants unbounded attempts.
- Operators can reason about, observe, and adjust limits without a code change to domain modules.
- A future approved shared store can be added behind the existing interface.

## In scope

- provider-neutral rate limit interface owned by the shared application boundary;
- deterministic in-memory adapter, correct for a single instance, used in development and test;
- fixed-window counting with explicit, documented semantics;
- named, individually configurable policies for a small set of protected surfaces;
- request identity derivation that never uses a raw client-supplied identifier as trusted input;
- standard `429` responses with `Retry-After`, and `RateLimit-*` headers on limited routes;
- fail-open behaviour on limiter fault, with an operational event recording the fault;
- emission of bounded operational events through the Feature 0010 boundary;
- tests covering allow, deny, window expiry, isolation between identities, fail-open, and configuration parsing;
- operations documentation, tuning guidance, and rollback.

### Protected surfaces

| Policy | Surface | Scope |
|---|---|---|
| `auth.attempt` | authentication routes | client network identity |
| `media.upload.initiate` | `POST /api/media/uploads` | owner |
| `recommendation.generate` | recommendation generation | owner |
| `profile.export` | `GET /api/profile/export` | owner |
| `internal.endpoint` | internal bootstrap and media processing routes | client network identity |

## Explicitly out of scope

- selecting or provisioning a shared store such as Redis;
- distributed or cluster-correct counting;
- sliding-window, token-bucket, or leaky-bucket algorithms;
- per-account quotas, billing limits, or usage metering;
- CAPTCHA, proof of work, device fingerprinting, or behavioural scoring;
- account lockout, which is deliberately avoided because it enables denial of service against a known account;
- WAF, CDN, or edge protections, which remain infrastructure concerns;
- IP reputation, geolocation, or blocklists;
- storing request bodies, headers, or client addresses beyond the bounded derivation described below.

## Architecture constraints

- Domain modules do not import the rate limiter.
- Application and transport code depend only on a small interface owned by a stable shared boundary, consistent with ADR 0011.
- Infrastructure owns adapters. The in-memory adapter must be explicitly documented as single-instance only.
- Policy names and configuration keys are allow-listed and validated. An unknown policy name is a programming error and must fail closed at construction, not silently permit traffic.
- Limiter state holds only a derived identity digest, a counter, and a window expiry. It never holds an email address, account identifier, raw client address, token, request body, or header.
- A limiter fault must fail open for user-facing traffic. Availability of a private wardrobe is more important than perfect enforcement, and a limiter outage must not lock a person out of their own data.
- Rate limit decisions emit only bounded operational events through the Feature 0010 interface.
- No unbounded growth: the in-memory adapter must evict expired entries and enforce a maximum tracked-key count with documented behaviour on saturation.

## Identity derivation

Two scopes only.

**Owner scope** uses the authenticated owner identifier already resolved by the request. It is never read from a request body or query parameter.

**Client network identity** is derived from the trusted proxy header configured for the deployment, falling back to the socket address where available. The derived value is immediately hashed with a per-process salt and only the digest is retained, so the limiter never stores an address. When no trusted proxy is configured, the header is ignored entirely, because an attacker-supplied forwarding header would otherwise let a caller mint unlimited identities.

When no address can be determined, a client-scoped policy is **unenforceable**. The request is permitted and the gap is reported as an operational event.

This corrects an earlier draft of this specification, which stated that unidentifiable callers should share a single bucket. That would have been actively harmful rather than merely weak: one caller could exhaust the shared authentication bucket and lock out every legitimate person, turning a protection into a denial-of-service vector and contradicting acceptance criterion 11. Permitting and reporting is the correct failure mode, and it makes the deployment requirement visible instead of silently harmful.

Client-scoped policies therefore require `SARTORIA_TRUST_PROXY_HEADERS=true` and a proxy that sets a trustworthy forwarding header. This must be stated prominently in operations guidance, because a deployment that omits it gets no client-scoped protection at all.

## Required behaviour

- A request under the limit proceeds unchanged.
- A request over the limit receives `429` with `Retry-After` in seconds and no body content describing other callers.
- Counting is per policy and per derived identity. Two identities never share a counter, and two policies never share a counter.
- A window expires exactly once and resets the counter.
- A limiter fault permits the request and records an operational event classified as a dependency failure.
- Limits are configurable per policy through documented environment variables with conservative, documented defaults.

## Acceptance criteria

1. A request within the configured limit succeeds and is unaffected in body, status, and headers other than the `RateLimit-*` additions.
2. The request immediately following the configured limit receives `429` with a positive integer `Retry-After`.
3. Counters are isolated between derived identities and between policies.
4. A counter resets after its window elapses, verified with an injected clock rather than by waiting.
5. A limiter that throws or times out permits the request and records exactly one bounded operational event.
6. No domain module imports the rate limiter, enforced by an executable architecture guard.
7. Limiter state contains no email address, account identifier, raw client address, token, header, or request body, proven by test.
8. A client-supplied forwarding header cannot mint additional identities when no trusted proxy is configured, proven by test.
8a. When callers cannot be told apart, a client-scoped policy permits the request and reports itself unenforceable, rather than applying a shared bucket.
9. An unknown or malformed policy configuration fails closed at construction with a clear error, and never results in an unlimited policy.
10. The in-memory adapter evicts expired entries and enforces a documented maximum tracked-key count.
11. Sign-in remains usable for a legitimate person after another identity has been limited.
12. Lint, strict TypeScript, unit and application tests, production build, standalone artifact, and Chromium E2E are green.
13. Architecture, Security, Privacy, Operations, and Documentation review evidence is recorded.

## Rollback

- Each policy can be disabled individually through documented configuration without a deployment.
- A global disable switch returns every surface to current behaviour.
- Limiting is enforcement-only and holds no domain state, so removal requires no migration or data change.
- Do not roll back by raising limits to an effectively unlimited value; disable the policy explicitly so the intent is visible in configuration.

## Notes on the single-instance constraint

The in-memory adapter is correct only for a single application instance. With several instances behind a load balancer, each enforces its own counters, so the effective limit is multiplied by the instance count.

This is acceptable for closed beta, which runs a single instance, and it is strictly better than no limit. It must be documented prominently in operations guidance, and a shared store must be approved through an ADR before horizontal scaling. The interface exists so that change requires no modification to any protected surface.
