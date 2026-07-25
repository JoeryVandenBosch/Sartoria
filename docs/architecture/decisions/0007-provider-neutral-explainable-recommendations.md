# ADR 0007 — Provider-Neutral Explainable Recommendations

Status: accepted  
Date: 2026-07-25  
Decision owners: Architecture, Product, Security, Privacy

## Context

Sartoria now has reliable owner-scoped wardrobe facts, private media, user-controlled style preferences, deterministic outfits, and private wear history. Recommendation value can now be introduced without making core wardrobe workflows dependent on AI.

## Decision

Implement recommendations behind a provider-neutral gateway. The application layer supplies a bounded recommendation context derived from the authenticated owner's wardrobe, profile, outfits, and explicit request. Provider output must be parsed into a strict versioned schema before it reaches the domain or UI.

Every accepted recommendation must include:

- a generated recommendation identifier;
- the authenticated owner identifier;
- the explicit user request or occasion;
- referenced wardrobe item identifiers;
- concise reasoning tied to those items and the user's profile;
- explicit exclusions or constraints applied;
- confidence as a bounded qualitative level;
- provider-neutral provenance metadata;
- created and expiry timestamps;
- correction, rejection, and fallback state.

The provider may propose only item identifiers present in the supplied owner-scoped context. The application layer verifies every returned identifier before persistence or display.

## Deterministic fallback

When no provider is configured, a provider fails, output is invalid, confidence is too low, or safety validation fails, Sartoria returns a deterministic wardrobe-first fallback. The fallback may reuse saved outfits or compose a restrained suggestion from owned, available items using explicit rules. It must clearly state that it is a fallback and never fabricate reasoning or wardrobe facts.

## Data minimisation

The gateway receives only the minimum context required for the request. Private notes, measurements, media object keys, exact account identifiers, and unrelated wardrobe history are excluded unless explicitly required and allowed by the user's controls. Measurements are never included unless recommendation consent is enabled.

## Security and privacy controls

- resolve owner identity only on the server;
- never send raw database credentials, storage keys, session tokens, or internal object keys to a provider;
- validate all model output against a strict schema;
- verify all referenced item identifiers against owner-scoped repositories;
- cap prompt and output sizes;
- store provider-neutral metadata rather than raw hidden reasoning;
- do not persist chain-of-thought;
- redact private notes from logs and diagnostics;
- provide user-visible correction and rejection controls;
- support deletion of stored recommendations;
- fail closed to deterministic fallback.

## Consequences

### Positive

- recommendations remain explainable and grounded in owned items;
- provider choice can change without rewriting product logic;
- invalid or unavailable AI does not block core workflows;
- user corrections become durable product signals;
- privacy and ownership checks remain enforceable outside the model.

### Trade-offs

- provider output is intentionally constrained;
- recommendation quality depends on wardrobe and profile completeness;
- deterministic fallback is less flexible than generative output;
- evaluation and provider operations require additional release controls.

## Rejected alternatives

### Couple the application directly to one model SDK

Rejected because provider changes, outages, pricing, and policy shifts must not control the domain architecture.

### Display free-form model text

Rejected because item references, exclusions, confidence, and correction cannot be reliably enforced.

### Persist hidden reasoning

Rejected because chain-of-thought is not required for user-facing explanations and creates unnecessary privacy and operational risk.

## Rollback

Disable provider-backed recommendation routes and retain deterministic fallback. Preserve stored recommendation and correction records unless an approved deletion or forward migration is executed.
