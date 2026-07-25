# Threat Model: Private Wardrobe Media

- Date: 2026-07-25
- Owners: Security and Privacy, Architecture, Media
- Related ADR: `docs/architecture/decisions/0004-quarantine-first-s3-compatible-media.md`
- Change risk: 4

## Assets

- original wardrobe image bytes;
- object-store credentials and presigned policies;
- ownership and wardrobe-item relationships;
- original filenames and storage metadata;
- scan status, detected media type, and rejection state;
- signed read URLs;
- deletion and audit evidence.

## Trust boundaries

1. User browser to Sartoria application.
2. User browser to private object storage through a presigned POST.
3. Sartoria application to PostgreSQL.
4. Sartoria application and worker to object storage.
5. Worker to malware scanner.
6. Operations platform to secrets, logs, backups, and lifecycle jobs.

## Primary threats and controls

### Cross-user media access

Threat: an attacker guesses a media or wardrobe identifier and requests upload, completion, read, or deletion.

Controls:

- resolve the authenticated user for every operation;
- repository queries include owner and wardrobe item;
- row-level security protects media metadata;
- object keys are random and not authorization tokens;
- signed GET URLs are issued only after owner-scoped ready-state lookup;
- cross-user tests cover known identifiers.

### Upload policy escalation

Threat: a user changes key, size, type, metadata, or bucket when submitting a presigned form.

Controls:

- exact bucket and key;
- exact media identifier metadata;
- content-length-range condition;
- allowlisted content type;
- five-minute expiration;
- restricted storage service credentials;
- completion verifies authoritative storage metadata.

### Malicious or polyglot content

Threat: an image extension or declared MIME hides executable, active, malformed, or malicious content.

Controls:

- no extension-based trust;
- quarantine prefix is never served;
- binary signature detection;
- allowlist of raster image types;
- SVG and active document formats rejected;
- malware scanning before promotion;
- scanner failure never yields ready state;
- transformation services later decode and re-encode accepted images.

### Oversized upload and resource exhaustion

Threat: large objects consume storage, scanner capacity, bandwidth, or application memory.

Controls:

- 20 MiB POST policy limit;
- HEAD verification before processing;
- streaming object and scanner operations;
- worker concurrency and timeout controls;
- lifecycle deletion of abandoned quarantine objects;
- no proxying complete image bytes through the web process.

### Presigned URL disclosure or replay

Threat: a copied upload or read URL is reused by another party.

Controls:

- maximum five-minute expiry;
- exact random object key;
- ready-state authorization before every read URL issuance;
- no signed URL logging or analytics capture;
- private bucket and blocked public access;
- user guidance avoids sharing private URLs;
- future high-sensitivity operations may use an application streaming proxy.

### Metadata spoofing and completion forgery

Threat: a client reports an upload completed when no matching object exists or metadata differs.

Controls:

- completion ignores client claims about stored size and metadata;
- server issues HEAD request;
- exact signed media identifier metadata must match;
- database transition is conditional on owner and current state;
- idempotency prevents duplicate completion effects.

### Scanner compromise or bypass

Threat: scanner output is forged, unavailable, or interpreted incorrectly.

Controls:

- scanner is an explicit adapter with schema-validated result;
- only the worker can record scan transitions;
- production requires scanner configuration;
- timeouts and errors result in retryable failure, not ready;
- raw scanner signatures are not returned to users;
- scanner service runs with read-only quarantine access and no database credentials where possible.

### Deletion failure and orphaned content

Threat: database deletion succeeds while storage bytes remain, or storage deletion partially fails.

Controls:

- deletion removes object variants before terminal database transition;
- deletion is idempotent;
- failed deletion remains retryable;
- reconciliation job detects orphaned objects and records;
- account deletion invokes media deletion propagation;
- storage lifecycle rules provide a final quarantine cleanup layer.

### Sensitive logging and telemetry

Threat: image bytes, filenames, signed URLs, secrets, object keys, or personal wardrobe content enter logs.

Controls:

- structured events contain only opaque media/item identifiers, category-safe status, and timestamps;
- URL query strings and authorization headers are redacted;
- original filename is never an object key or event field;
- application errors use user-safe messages;
- debug logging of SDK requests is disabled in production.

## Abuse cases

- repeatedly initiate uploads without completing them;
- upload allowed MIME with unsupported binary content;
- race completion and deletion;
- replace a quarantined object by replaying a still-valid POST;
- request read URL while scan is pending or rejected;
- submit another user's wardrobe item identifier;
- exploit scanner decompression or parser vulnerabilities;
- upload an image containing sensitive third-party information.

## Required release tests

- cross-user upload initiation, completion, read, and deletion denial;
- exact POST condition and expiration assertions;
- missing, empty, oversized, metadata-mismatched, and unsupported object rejection;
- scanner safe, malicious, timeout, and malformed-result behaviour;
- read URL only for ready state;
- idempotent deletion and reconciliation;
- logging redaction review;
- deployed bucket public-access and CORS verification.

## Residual risk

Users control the content they photograph and upload. Product guidance, privacy notices, retention controls, export, deletion, and abuse response remain necessary even after technical isolation is verified.
