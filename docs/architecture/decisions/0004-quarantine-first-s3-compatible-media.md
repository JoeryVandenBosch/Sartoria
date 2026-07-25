# ADR 0004: Quarantine-first S3-compatible private media

- Status: Accepted
- Date: 2026-07-25
- Owners: Architecture, Security and Privacy, Media
- Risk level: 4

## Context

Sartoria wardrobe images are private personal data. Uploading them through the application server would increase memory pressure and data exposure, while giving a browser unrestricted object-storage credentials would be unacceptable. Uploaded files cannot be trusted based on filename or browser-supplied media type.

The media capability needs direct upload, strict size and type constraints, malware scanning, short-lived private access, deterministic deletion, provider portability, and a workflow that remains usable while scanning is pending.

## Decision

Use a private S3-compatible object store behind a provider-neutral `MediaObjectStore` interface.

- The server creates a unique media record and random object key before upload.
- The browser receives a presigned POST valid for five minutes.
- The POST policy fixes the object key, declared media type, and metadata and limits content length.
- New objects enter a `quarantine/` prefix and are never readable by users.
- Upload completion verifies object existence, content length, and signed metadata through a server-side HEAD request.
- A background scanning boundary performs binary type detection and malware scanning.
- Only accepted objects are copied to a `private/` prefix and removed from quarantine.
- User access uses purpose-limited signed GET URLs valid for at most five minutes.
- Rejected, abandoned, deleted, and orphaned objects are removed from storage through idempotent deletion.
- Bucket public access remains disabled. Object keys contain random media identifiers, not filenames, email addresses, wardrobe names, or user identifiers.
- Database state is authoritative for ownership and lifecycle. Object storage is authoritative only for bytes and storage metadata.

## Initial media policy

- maximum original size: 20 MiB;
- minimum size: 1 byte;
- accepted declared and detected formats: JPEG, PNG, WebP, HEIC, and HEIF;
- SVG and other active document formats are rejected;
- original filenames are stored privately in PostgreSQL but never used as object keys;
- download disposition is inline only for media that completed scanning and promotion;
- signed URLs and POST policies expire after 300 seconds.

## Lifecycle

```text
initiated → uploaded → scanning → ready
                         ├── rejected
                         └── failed

initiated | uploaded | ready | rejected | failed → deleted
```

State transitions are explicit and validated. A record cannot become `ready` without detected type, scanner evidence, promoted object metadata, and an owner-scoped repository update.

## Consequences

### Positive

- Large uploads bypass application-server memory.
- Quarantined bytes cannot be served to users.
- Storage remains replaceable across S3-compatible vendors.
- Database ownership and object lifecycle remain auditable.
- Short-lived access reduces accidental disclosure from copied URLs.

### Costs

- Direct upload requires CORS and bucket policy configuration.
- A scanner worker and orphan cleanup job are operational dependencies.
- Upload completion is eventually consistent from the user perspective.
- HEIC and HEIF require later transformation before universal browser display.

## Rejected alternatives

- Public bucket or permanent object URLs: rejected due to privacy risk.
- Trusting file extensions or browser MIME values: rejected because they are user controlled.
- Uploading directly into the readable prefix: rejected because unscanned objects could be exposed.
- Embedding a storage vendor SDK in domain or application code: rejected to preserve portability and testability.

## Release conditions

Production release requires a private bucket, blocked public access, restricted service credentials, reviewed CORS, lifecycle cleanup, a deployed malware scanner, audit evidence, encrypted transport and storage, and successful cross-user and rejected-file tests.
