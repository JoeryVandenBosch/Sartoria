# Feature 0010 — Privacy-safe operational observability

## Status

Approved as the first repository-owned Phase 7B implementation slice when external staging provisioning is unavailable.

## Objective

Add a provider-neutral observability foundation that helps operators understand application health and failures without exposing private wardrobe, identity, media, profile, travel, recommendation, or staging data.

## User and operator outcome

- User workflows remain reliable when an observability sink is unavailable.
- Operators can correlate a failed request with a release and bounded operational event.
- Security and privacy reviewers can prove that sensitive content is excluded by construction rather than by convention alone.
- A future approved logging, metrics, or tracing provider can be added behind an interface without entering domain modules.

## In scope

- versioned structured operational event envelope;
- provider-neutral application interface and infrastructure adapters;
- server-generated correlation identifier for request-scoped operations;
- bounded event names, severity, outcome, duration, deployment environment, and release identifier;
- deterministic in-memory adapter for tests and development inspection;
- privacy-safe structured console adapter suitable for container collection;
- event emission at a small set of critical existing boundaries:
  - authentication/session resolution outcome without account identity;
  - database readiness outcome;
  - media processing lifecycle outcome without file name, key, URL, binary data, or owner identifier;
  - recommendation provider/fallback outcome without prompt, profile, wardrobe, item identifiers, or provider response;
  - staging identity bootstrap outcome without email, user identifier, password, token, or operator reference;
- bounded sink failure handling that never breaks the primary user workflow;
- tests proving both allowed fields and forbidden-data exclusion;
- operational documentation, event catalogue, retention assumptions, and rollback.

## Explicitly out of scope

- selecting a hosted observability vendor;
- sending production telemetry to an external provider;
- browser analytics, behavioural tracking, session replay, or heatmaps;
- logging request or response bodies;
- logging email addresses, user identifiers, owner identifiers, wardrobe item identifiers, media keys, file names, signed URLs, fit notes, measurements, travel destinations, prompts, provider payloads, passwords, tokens, cookies, or headers containing credentials;
- full distributed tracing;
- rate limiting, invitations, backups, or retention enforcement; these remain later Phase 7B slices.

## Architecture constraints

- Domain modules do not import an observability SDK.
- Application code depends only on a small interface owned by a stable shared application boundary.
- Infrastructure owns console or future provider adapters.
- Event names and payload keys are allow-listed and schema-validated.
- Arbitrary objects, exceptions, request objects, environment objects, and provider responses cannot be passed directly to the sink.
- Error output uses a bounded classification or error name, never raw stack traces in user-facing responses and never sensitive message content in structured events.
- Correlation identifiers are random, bounded, non-semantic, and not accepted blindly from untrusted clients.
- Sink errors are swallowed only after a minimal local failure signal; they must not recursively emit observability events.

## Required event envelope

The exact implementation may refine names through an ADR, but every event must include only bounded equivalents of:

- schema version;
- event name from an allow-list;
- severity;
- ISO timestamp;
- deployment environment;
- release identifier when configured;
- generated correlation identifier when request-scoped;
- outcome from an allow-list;
- optional non-negative duration in milliseconds;
- optional bounded, event-specific scalar attributes from an allow-list.

## Acceptance criteria

1. The same event input produces deterministic serialisation apart from explicitly supplied time and correlation identifiers.
2. Unknown event names, keys, nested objects, oversized strings, negative durations, and non-finite numbers are rejected before emission.
3. Tests prove forbidden private fields cannot be represented by the event schemas.
4. No existing domain module imports the observability implementation or provider package.
5. Existing user workflows continue successfully when the configured sink throws or times out.
6. Production configuration never enables an unapproved external endpoint.
7. Console output is one JSON object per line and contains no ANSI formatting or unbounded exception serialisation.
8. Authentication, readiness, media, recommendation fallback/provider, and bootstrap boundaries emit only the approved outcome facts.
9. Logs and tests use synthetic data only.
10. Lint, strict TypeScript, unit/application tests, production build, standalone artifact, and Chromium E2E are green.
11. Architecture, Security, Privacy, Operations, and Documentation review evidence is recorded.

## Rollback

- Event emission remains side-effect-only and removable without changing domain state or database schema.
- Disable the adapter or select a no-op adapter through documented configuration.
- Revert boundary instrumentation while preserving the interface and tests when a specific event causes operational noise.
- Do not roll back by broadening payloads or logging raw objects.

## Exact Claude start instruction

Implement this feature as one risk-level-3 vertical slice from the latest `main`. Follow `AGENTS.md`, `CLAUDE.md`, AIFramework model routing, and the self-review protocol. Inspect existing error handling and module conventions first. Create an ADR only when the shared boundary or configuration decision is material. Commit continuously, open a pull request, run the complete gate, fix concrete failures, record independent review evidence, and merge only when green. Do not redesign completed Sartoria features and do not wait for external staging credentials.