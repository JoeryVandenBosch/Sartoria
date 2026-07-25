# Explainable Recommendations Architecture, Security, Privacy, and Product Review

Date: 2026-07-25  
Scope: Phase 5 provider-neutral explainable recommendations  
Review mode: role-separated repository review under AIFramework  
Change risk: 3 — explicit provider-mediated processing of private wardrobe and preference context

## Reviewed surfaces

- `src/modules/recommendations/domain/`
- `src/modules/recommendations/application/`
- `src/modules/recommendations/transport/`
- `src/modules/recommendations/infrastructure/`
- `src/app/recommendations/`
- `src/app/recommendations.css`
- `migrations/0006_wardrobe_recommendations.sql`
- `.env.example`
- recommendation unit, application, schema, privacy, and browser tests
- ADR 0008, Feature 007, and the recommendation threat model

## Architecture review

### Provider neutrality

Status: accepted.

The domain and application layers depend on a `RecommendationGateway` contract rather than a provider SDK. Provider and model labels are normalised provenance fields. The HTTP gateway is an infrastructure adapter and can be replaced without changing recommendation-domain behaviour.

### Deterministic core

Status: accepted.

Wardrobe, profile, outfit, media, and wear-history workflows remain independent of recommendation providers. Provider absence, timeout, invalid output, unsafe references, and low confidence all resolve to a deterministic wardrobe-first result.

### Structured boundary

Status: accepted.

Provider output is parsed through a strict, versioned Zod contract. Free-form output, extra fields, duplicate references, unknown identifiers, oversized explanations, and unsupported confidence values do not enter the domain.

### Persistence boundary

Status: accepted with deployment verification.

Recommendations persist through a repository interface with deterministic in-memory and PostgreSQL adapters. PostgreSQL enables and forces row-level security. Runtime role and transaction-local `app.user_id` behaviour must be verified in the deployed environment.

## Security review

### Ownership enforcement

Status: accepted.

Owner identity is resolved server-side. Source data is loaded through owner-scoped repositories. The provider receives no owner identifier. Returned item identifiers are validated against the exact available owner-scoped context. Stored records and feedback mutations are owner-scoped, and PostgreSQL forces RLS.

### Provider transport

Status: accepted with infrastructure controls.

The gateway requires an absolute endpoint, rejects redirects, caps request and response bodies at 64 KiB, enforces a bounded timeout, requires a high-entropy secret, and requires HTTPS in production. Egress allow-listing, DNS controls, secret rotation, and subprocessor approval remain deployment gates.

### Output safety

Status: accepted.

Only schema-valid JSON is accepted. Item identifiers, item count, explanation lengths, exclusions, and confidence are bounded. Unknown or cross-owner references activate fallback. No raw HTML, executable content, or hidden reasoning is rendered or stored.

### Concurrency and feedback integrity

Status: accepted.

Correction and rejection require the expected revision and use owner-and-revision predicates. Deletion is an explicit owner-scoped terminal action and removes recommendation feedback with the parent record.

## Privacy review

### Data minimisation

Status: accepted.

The provider context is an allow-listed projection. It excludes account identifiers, session data, credentials, media keys and URLs, outfit styling notes, wear-event notes, and unrelated history. Measurements are null unless the user enables recommendation consent.

### Purpose limitation

Status: accepted.

Every recommendation is explicitly initiated by the user. There is no background generation, location ingestion, calendar access, automatic wear inference, cross-user learning, or autonomous purchase behaviour.

### Transparency and control

Status: accepted.

The UI identifies provider versus deterministic fallback, states confidence, lists item-grounded explanations and exclusions, and exposes correction, rejection, and deletion. Corrections are not silently reused in later provider requests.

### Retention

Status: accepted with operational follow-up.

Recommendations receive a 30-day relevance expiry marker and can be deleted by the owner. Automatic expiry deletion, backup retention, and restore-time deletion propagation require an approved production policy before release.

## Product review

### User value

Status: accepted.

The workflow provides useful advice even without a provider, remains grounded in owned items, reuses saved outfits where appropriate, and makes every recommendation inspectable rather than opaque.

### Product safety

Status: accepted.

The feature does not purchase, share, score people, generate images, or invent wardrobe items. Low-confidence provider output is rejected in favour of deterministic fallback.

### Experience quality

Status: accepted.

Request, result, provenance, confidence, item evidence, exclusions, correction, rejection, and deletion are all available as text and keyboard-operable controls. Missing or expired records do not compromise core workflows.

## Validation evidence

Successful GitHub Actions run: `30173937686`.

- ESLint: passed;
- strict TypeScript: passed;
- unit and application tests: 75 passed;
- production build: passed;
- Chromium installation: passed;
- end-to-end browser tests: 6 passed;
- recommendation browser flow covers request, fallback provenance, explanation, correction, rejection, and deletion.

## Findings and disposition

1. **Type-level measurement test narrowing** — fixed before the green run.
2. **Transient server-action success assertion** — replaced with durable persisted-state assertions before the green run.
3. **Provider endpoint network controls** — open deployment gate; no provider activation until approved.
4. **Automatic retention cleanup** — deferred; expiry is visible and owner deletion is available.
5. **Production two-user isolation test** — required after migration and before release approval.

## Decision

Approved for merge into `main` as an implementation-complete Phase 5 slice after the final documentation-state CI run is green.

Not approved for production provider activation until all external deployment gates in the operations runbook are completed and explicit Architecture, Security, Privacy, and Product release approval is recorded.
