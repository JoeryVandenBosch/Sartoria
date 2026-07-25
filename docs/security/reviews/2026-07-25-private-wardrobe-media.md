# Security and Privacy Review: Private Wardrobe Media

- Date: 2026-07-25
- Review role: Security and Privacy Agent
- Change risk: 4
- Scope: PR #7 private wardrobe media vertical slice
- Release decision: approved for repository merge; not approved for production release

## Review boundaries

Reviewed media ownership and lifecycle state, transport validation, direct-upload policy construction, object-storage prefixes, metadata verification, binary type detection, malware-scanning protocol, worker authentication, PostgreSQL constraints and row-level security, short-lived access, deletion propagation, development adapters, UI behaviour, logs, tests, and operations guidance.

## Blocking findings resolved

### Asynchronous upload form lost its stable form reference

The browser workflow referenced `event.currentTarget` after asynchronous operations. React no longer guaranteed the reference remained usable, which prevented the item page from refreshing to its durable media state. The form element is now captured before asynchronous work and reset safely after completion.

### S3 client configuration passed an explicit undefined endpoint

Strict TypeScript correctly rejected a client configuration containing an exact optional property with an undefined value. The adapter now omits the endpoint property unless a reviewed custom endpoint is configured.

### Development media response used an incompatible body type

The development read route now returns a concrete `ArrayBuffer`, preserving strict transport typing and avoiding environment-specific response behaviour.

### Failed upload-policy creation left an active initiated record

Policy-generation failures now make a best-effort object cleanup and transition the owner-scoped database record to a rejected terminal state. Any secondary cleanup failure preserves the original error and remains visible to reconciliation.

### ClamAV timeout did not terminate an established scan socket

The scanner now destroys the socket with an error after the configured timeout. Connection, streaming, and verdict reads therefore fail closed instead of waiting indefinitely.

### End-to-end retries reused persistent development records

The private-media E2E test now uses unique wardrobe-item names per attempt and asserts durable `ready` state and owner-scoped image rendering rather than transient UI copy.

## Verified controls

- Every upload initiation verifies the wardrobe item through an owner-scoped repository query.
- Media records use opaque random identifiers and object keys contain no user ID, item name, or original filename.
- Presigned POST policy is restricted to the exact quarantine key, declared type, media metadata, one-to-20-MiB content range, and five-minute expiry.
- Completion trusts server-side object metadata rather than client claims.
- Missing, empty, oversized, metadata-mismatched, and unsupported content can never reach ready state.
- Binary signature detection and malware scanning gate promotion from quarantine to private storage.
- Scanner timeout, malformed result, or infrastructure error never yields ready state.
- Quarantine objects never receive user read URLs.
- Ready media receive owner-authorised, purpose-limited read URLs with five-minute expiry.
- PostgreSQL media rows use a composite wardrobe-item/owner foreign key, constraints, indexes, forced row-level security, and owner policy.
- State changes use conditional expected-status updates to prevent silent races.
- Worker messages are schema-validated and require a constant-time verified high-entropy bearer token.
- Queue and worker credentials are separate configuration values.
- Production cannot select in-memory media storage, signature-only scanning, or development read/upload routes.
- Deletion is owner-scoped, idempotent, and removes quarantine and private variants before terminal database state.
- No image bytes, signed URLs, object credentials, original filenames, or wardrobe content are intentionally written to application logs.
- CI validates upload policy constraints, lifecycle transitions, ownership denial, rejection paths, scanning, promotion, deletion, configuration failure, production build, and end-to-end private media.

## Validation evidence

GitHub Actions run `30168458037` completed successfully against the final implementation state before this review record was committed.

Passed controls:

- dependency installation;
- ESLint;
- strict TypeScript checking;
- 31 unit and application tests;
- production Next.js build;
- Chromium installation;
- end-to-end wardrobe creation, private upload, secure processing, ready-state display, and private image retrieval.

No diagnostic ZIP was generated because validation succeeded.

## Residual production-release risks

The following deployment controls remain mandatory:

1. Provision a private S3-compatible bucket with public access blocked, TLS, encryption, reviewed CORS, and quarantine lifecycle cleanup.
2. Use restricted non-administrative service credentials and verify the application cannot alter bucket public-access controls.
3. Deploy an isolated ClamAV service with monitored signature updates, resource limits, network restrictions, and no database credentials.
4. Deploy an authenticated, retry-safe processing queue and verify queue-to-worker token separation.
5. Apply and review `migrations/0002_wardrobe_media.sql` against a disposable PostgreSQL environment and verify the application role cannot bypass row-level security.
6. Run deployed cross-user initiation, completion, read, worker, and deletion tests.
7. Run malicious test-signature, oversized, polyglot, malformed, scanner-timeout, queue-retry, orphan-reconciliation, and deletion-failure tests in an isolated non-production environment.
8. Configure storage and database backup/restore, deletion reconciliation, incident response, monitoring, and retention ownership.
9. Verify access logs, error reporting, analytics, and proxies redact signed URL queries, authorization headers, filenames, and object metadata.
10. Obtain explicit human approval before enabling production uploads.

## Decision

The implementation is approved for merge into `main`. Production upload and media-read capabilities remain blocked until the residual deployment controls have evidence and explicit human approval.
