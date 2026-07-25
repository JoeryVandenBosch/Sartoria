# Feature 007 — Explainable Wardrobe Recommendations

Status: implementation complete, reviewed, and validated in CI  
Risk: 3 — provider-mediated processing of private wardrobe and preference context

## User outcome

A signed-in user can ask Sartoria for a wardrobe-first outfit recommendation, understand why each owned item was selected, see which constraints were applied, reject or correct the result, and still receive a useful deterministic answer when AI is unavailable.

## In scope

- explicit recommendation request with optional occasion and bounded context;
- provider-neutral gateway interface;
- versioned structured request and response schemas;
- owner-scoped wardrobe, profile, outfit, and wear-history context builder;
- strict item-reference verification;
- user-facing explanation, exclusions, confidence, and provenance state;
- deterministic wardrobe-first fallback;
- recommendation persistence and expiry;
- correction, rejection, and deletion controls;
- privacy-safe diagnostics and evaluation hooks;
- deterministic test provider and failure modes;
- accessible responsive recommendation UI.

## Out of scope

- autonomous purchases;
- public sharing;
- social scoring;
- image generation;
- hidden background recommendations;
- calendar or precise-location ingestion;
- raw chain-of-thought storage or display;
- provider-specific domain objects;
- cross-user learning.

## Acceptance criteria

### Request

1. The user explicitly initiates every recommendation.
2. The request contains a bounded purpose or occasion and optional concise notes.
3. Owner identity is resolved server-side and cannot be supplied by the client.
4. Context includes only owner-scoped records relevant to the request.
5. Optional measurements are excluded unless the profile consent control is enabled.

### Structured output

1. Provider output is rejected unless it matches the current versioned schema.
2. Every recommended item identifier must exist, belong to the current user, and be available.
3. Duplicate and unknown identifiers are rejected.
4. The response contains concise item-grounded reasoning, applied exclusions, and bounded confidence.
5. Provider metadata is normalised and raw hidden reasoning is never persisted.

### Fallback

1. Missing configuration, timeout, provider failure, invalid output, unsafe references, or low confidence activates deterministic fallback.
2. Fallback recommendations reference only owned and available wardrobe items or saved outfits.
3. The UI identifies fallback results and the reason for fallback clearly.
4. Core wardrobe, outfit, profile, and wear-history workflows remain available during provider failure.

### User control

1. The user can reject a recommendation.
2. The user can record a bounded correction or reason.
3. The user can delete stored recommendations and associated feedback.
4. Corrections remain owner-scoped and are not silently sent to another provider request.

### Privacy and security

1. Session tokens, credentials, account identifiers, object keys, private media URLs, private wear notes, and unrelated private notes never enter provider context.
2. Prompt and response bodies are capped at 64 KiB.
3. Logs contain identifiers and outcome codes only, not private request text or profile content.
4. PostgreSQL tables enable and force row-level security.
5. Provider mode requires an absolute endpoint, high-entropy secret, bounded timeout, and HTTPS in production.
6. Missing or invalid provider configuration falls back without sending private context.

### Accessibility

1. Request controls have programmatic labels and clear descriptions.
2. Loading, fallback, success, and error states use appropriate live regions.
3. Explanation and confidence are text, not colour-only indicators.
4. Correction, rejection, and deletion are keyboard operable.
5. Focus remains visible throughout the workflow.

### Validation gate

- ESLint passes;
- strict TypeScript passes;
- 75 domain, gateway, schema, fallback, ownership, privacy, and persistence tests pass;
- production build passes;
- 6 Chromium end-to-end browser flows pass, including request, explanation, correction, rejection, deletion, and fallback;
- Architecture, Security, Privacy, and Product review is recorded.

## Production release gates

- provider and subprocessors approved;
- production migration applied;
- runtime role and forced RLS verified;
- egress and DNS controls approved;
- secret management and rotation configured;
- deployed two-user isolation tests passed;
- logging and failure-mode drills passed;
- retention, backup, restore, and deletion behaviour approved;
- explicit production release approval recorded.

## Rollback

Disable provider-backed recommendation mode and retain deterministic fallback. Recommendation routes may be hidden independently. Preserve user records unless an approved deletion or forward migration is executed.
