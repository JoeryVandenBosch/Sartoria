# Explainable Recommendations Handoff

Date: 2026-07-25  
Branch: `feature/explainable-recommendations`  
Pull request: #12  
Risk: 3 — explicit provider-mediated processing of private wardrobe and preference context

## Delivered

- `/recommendations` private collection and explicit request experience;
- `/recommendations/[recommendationId]` owner-scoped explanation and evidence view;
- provider-neutral `RecommendationGateway` contract;
- versioned request and provider-response schemas;
- owner-scoped, allow-listed context builder;
- measurement consent enforcement;
- exact ownership and availability verification for returned item identifiers;
- duplicate, malformed, oversized, unknown, and low-confidence output rejection;
- deterministic saved-outfit and wardrobe-first fallback;
- provider/fallback provenance and reason codes;
- bounded confidence and concise item-grounded explanations;
- explicit exclusions and constraints;
- PostgreSQL persistence with forced RLS;
- 30-day relevance expiry state;
- owner-scoped correction, rejection, and deletion;
- private history and accessible feedback controls;
- bounded HTTP gateway with HTTPS enforcement, redirect rejection, timeout, and 64 KiB request/response limits;
- deterministic in-memory development persistence;
- migration, environment template, threat model, operations runbook, and role-separated review;
- domain, application, schema, privacy, ownership, fallback, and browser-flow tests.

## Validated code gate

Successful GitHub Actions run: `30173937686`.

- ESLint: passed;
- strict TypeScript: passed;
- unit and application tests: 75 passed;
- production build: passed;
- Chromium installation: passed;
- end-to-end browser tests: 6 passed;
- recommendation flow: request, deterministic fallback, provenance, explanation, correction, rejection, and deletion passed.

The first validation attempt identified strict test-narrowing issues. The second exposed an assertion against a transient server-action message. Both were corrected; the final test now verifies durable persisted correction and rejection state.

A final documentation-state validation run is required after this handoff, roadmap, README, feature-state, and review evidence are committed.

## Architecture decisions

- core workflows remain deterministic and provider-independent;
- provider integration is isolated behind a gateway contract;
- no provider SDK types enter the domain;
- provider output must match schema version 1;
- only identifiers present in the supplied owner-scoped context may be accepted;
- low-confidence and unsafe provider results are replaced rather than displayed;
- deterministic fallback is a first-class product path;
- raw hidden reasoning is never requested for persistence or stored;
- recommendation records contain concise user-facing evidence and provider-neutral provenance.

## Security and privacy decisions

- owner identity is resolved only on the server and is not sent to the provider;
- context is an explicit allow-listed projection rather than serialized domain objects;
- private outfit notes, wear notes, media data, credentials, session data, and unrelated history are excluded;
- optional measurements remain excluded unless recommendation consent is enabled;
- provider requests and responses are capped at 64 KiB;
- production endpoints require HTTPS and redirects are rejected;
- secrets remain server-side and are absent from provenance and stored records;
- PostgreSQL enables and forces row-level security;
- correction and rejection are revision-protected;
- deletion removes recommendation and feedback together;
- logs must contain outcome codes and identifiers only, not private content.

## Production work still blocked

- approve provider and subprocessors;
- approve data fields, purpose, region, retention, training, and deletion terms;
- configure egress allow-list and DNS protections;
- provision and rotate the provider secret through approved secret management;
- apply `0006_wardrobe_recommendations.sql` through the approved migration path;
- verify the runtime role is non-superuser and lacks `BYPASSRLS`;
- run deployed two-user cross-owner tests;
- verify application and gateway log redaction;
- execute provider failure and malformed-output drills;
- approve automatic expiry cleanup, backup retention, restore, and deletion propagation;
- obtain explicit Product, Architecture, Security, and Privacy production release approval.

## Rollback

Set `SARTORIA_RECOMMENDATION_MODE=fallback` to remove provider dependency immediately while preserving deterministic advice. Recommendation navigation and route surfaces can be hidden separately. Do not drop the recommendation table after user data exists; use an approved forward migration, export, or restore process.

## Exact next action

Run the complete final validation gate on the documentation-complete branch. Merge PR #12 only after it is green. Then begin Phase 6 with an ADR and acceptance criteria for occasion/travel planning, packing lists, and factual wardrobe insights while keeping external climate data and recommendation AI behind explicit, provider-neutral boundaries.
