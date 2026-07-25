# Explainable Recommendations Threat Model

Date: 2026-07-25  
Scope: Phase 5 provider-neutral recommendations, deterministic fallback, persistence, feedback, and UI  
Risk: 3 — explicit provider-mediated processing of private wardrobe and preference context

## Assets

- owner-scoped wardrobe facts;
- private style-profile controls and optional measurements;
- saved outfit membership and factual wear aggregates;
- explicit recommendation request text;
- structured recommendation output and provenance;
- private correction and rejection feedback;
- provider endpoint credentials;
- database ownership boundary and row-level-security context.

## Trust boundaries

1. Browser to Sartoria server action.
2. Sartoria application to owner-scoped repositories.
3. Sartoria application to the provider-neutral HTTP gateway.
4. Gateway to the approved external recommendation service.
5. Application to PostgreSQL under transaction-local owner context.
6. Stored recommendation to owner-scoped detail and feedback UI.

## Data flow

1. The authenticated user explicitly submits an occasion and optional bounded notes.
2. The server resolves owner identity; the client cannot supply an owner identifier.
3. The context builder reads only the owner's available wardrobe, private profile controls, saved outfits, and date-only wear aggregates.
4. Private styling notes, wear-event notes, media keys, media URLs, account identifiers, credentials, and unrelated history are excluded.
5. Measurements are included only when the profile's recommendation-consent control is enabled.
6. In provider mode, the bounded context is sent over HTTPS to the configured endpoint.
7. Provider output must match schema version 1 and pass ownership, availability, duplication, and confidence checks.
8. Any failure activates deterministic fallback before persistence.
9. The owner may correct, reject, or delete the stored record.

## Threats and controls

### Cross-owner context disclosure

Threat: another user's wardrobe, profile, outfit, wear history, recommendation, or feedback enters a request or response.

Controls:

- owner identity is resolved server-side;
- every source repository is queried with the authenticated owner identifier;
- provider context contains no owner or account identifier;
- returned wardrobe identifiers are checked against the exact available context set;
- recommendation queries and mutations are owner-scoped;
- PostgreSQL enables and forces row-level security.

Residual risk: production runtime roles and connection-pool transaction behaviour require deployment verification.

### Prompt or context over-collection

Threat: private notes, measurements without consent, media locations, or unrelated history are sent externally.

Controls:

- dedicated allow-list context types;
- no generic domain-object serialization;
- outfit styling notes and wear-event notes are omitted;
- measurements are null unless explicit consent is enabled;
- owner identifiers, media identifiers, object keys, and signed URLs are absent;
- request body is capped at 64 KiB.

Residual risk: future context fields require renewed Privacy review.

### Provider output injection or fabrication

Threat: free-form output, unknown identifiers, duplicate identifiers, unbounded text, or hidden instructions reach the UI or database.

Controls:

- strict Zod schema with unknown-key rejection;
- schema version fixed to `1`;
- bounded item count, reasons, summary, exclusions, and confidence;
- duplicate identifiers and exclusions rejected;
- every identifier checked against the supplied owner-scoped set;
- low-confidence output discarded;
- no HTML rendering and no raw hidden reasoning storage.

Residual risk: semantic quality still requires evaluation and user feedback.

### Provider outage, timeout, or malformed response

Threat: recommendations become unavailable or block core workflows.

Controls:

- bounded 1–60 second timeout;
- redirect rejection;
- response body capped at 64 KiB;
- non-success HTTP, invalid JSON, invalid schema, unsafe references, and low confidence all activate fallback;
- wardrobe, profile, outfit, media, and history workflows remain independent.

Residual risk: fallback quality is intentionally conservative.

### SSRF or insecure transport

Threat: a malicious or incorrect endpoint exposes private context or reaches internal services.

Controls:

- absolute HTTP/HTTPS URL validation;
- HTTPS required in production;
- endpoint configured outside user input;
- redirects rejected;
- bearer secret kept server-side;
- deployment allow-list and egress controls required before provider activation.

Residual risk: URL validation alone does not replace network egress policy or DNS-rebinding controls.

### Credential disclosure

Threat: provider secret appears in browser code, persisted records, logs, or errors.

Controls:

- secret is read only in server infrastructure code;
- secret is never included in provenance;
- response and UI expose provider/model labels only;
- logs should record identifiers and outcome codes, not headers or request bodies;
- minimum secret length is enforced.

Residual risk: hosting-platform secret storage and log redaction require operational verification.

### Feedback tampering or stale writes

Threat: correction or rejection overwrites a newer state or changes another owner's record.

Controls:

- owner-scoped lookup;
- expected revision required;
- repository update uses owner and revision predicates;
- correction and rejection text is bounded;
- inaccessible records use not-found semantics.

Residual risk: delete currently removes the owner-scoped record without a revision predicate; this is intentional because deletion is final and owner-authorised, but UI confirmation may be strengthened later.

### Persistent sensitive-data retention

Threat: request notes and feedback are retained longer than expected.

Controls:

- recommendations receive a 30-day relevance expiry;
- expired state is visible;
- owner can delete recommendation and feedback together;
- provider raw response and chain-of-thought are not stored;
- future retention cleanup requires an approved operational job.

Residual risk: expiry is informational until an automated deletion policy is approved.

## Abuse cases

- submit a client-supplied owner identifier: ignored because no owner field is accepted;
- reference another user's item in provider output: provider result is discarded;
- return duplicate items: schema/domain validation rejects it;
- return low confidence: deterministic fallback replaces it;
- return oversized or malformed payload: gateway rejects it;
- attempt HTTP provider endpoint in production: configuration fails closed to fallback;
- store private correction and expect it in later prompts: not included without a future explicit product policy;
- delete recommendation through another account: owner-scoped repository returns false.

## Required production verification

- provider endpoint and subprocessor approval;
- egress allow-list and DNS controls;
- secret rotation and access review;
- runtime database role is non-superuser and lacks `BYPASSRLS`;
- two-user cross-owner tests for request, detail, feedback, and delete;
- request/response logging proves private text and credentials are absent;
- timeout, malformed output, unsafe reference, and provider-outage drills activate fallback;
- retention and backup-deletion expectations are approved;
- explicit release approval from Product, Architecture, Security, and Privacy.
