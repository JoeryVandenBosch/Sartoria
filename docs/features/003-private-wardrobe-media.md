# Private Wardrobe Media

## Outcome

A signed-in user can attach a private image to an owned wardrobe item, see its processing state, and later view it through a short-lived URL only after upload validation and malware scanning succeed.

## User journey

1. Open an owned wardrobe item.
2. Select an image.
3. Sartoria validates the browser-visible size and type for immediate feedback.
4. Sartoria creates an owner-scoped media record and five-minute quarantine upload policy.
5. The browser uploads directly to private object storage.
6. The browser confirms completion to Sartoria.
7. Sartoria verifies storage metadata and marks the image pending scan.
8. A worker validates binary type, scans for malware, and promotes safe content.
9. The item page displays `processing`, `ready`, or `rejected` state.
10. Ready images use a short-lived signed URL. The user may delete any owned image.

## Scope

- private media domain model and lifecycle transitions;
- PostgreSQL media metadata migration and repository;
- owner and wardrobe-item authorization on every operation;
- S3-compatible quarantine upload policies;
- content-length, declared type, signed metadata, and storage HEAD verification;
- malware-scanner interface and processing use case;
- promotion from quarantine to private storage;
- five-minute signed read URLs for ready objects only;
- idempotent deletion of database state and all object variants;
- upload UI and processing states on wardrobe item detail;
- privacy-safe events and logs;
- unit, application, repository, storage-policy, authorization, and end-to-end tests;
- operational configuration and cleanup documentation.

## Acceptance criteria

1. A media record can only reference a wardrobe item owned by the active user.
2. Object keys do not contain user identifiers, original filenames, garment names, or other personal data.
3. Upload policy expiration is no longer than 300 seconds.
4. Upload policy fixes the exact quarantine key and media identifier metadata.
5. Upload policy limits objects to 20 MiB and accepted declared image types.
6. Completion fails when the object is missing, oversized, empty, has mismatched metadata, or has an unsupported declared type.
7. Uploaded bytes remain inaccessible until the record is `ready`.
8. Scanner output and binary type detection are treated as untrusted input and validated.
9. Declared and detected media types must both be allowed and compatible.
10. A safe object is promoted to the private prefix and removed from quarantine.
11. A malicious or unsupported object is rejected and deleted from quarantine.
12. Signed read URLs are only generated for ready media owned by the active user and expire within 300 seconds.
13. Deletion is idempotent and removes quarantine and private objects before recording the terminal deleted state.
14. Another user cannot initiate, complete, view, scan, or delete media for an item they do not own.
15. Production fails closed when object storage or malware-scanning configuration is absent.
16. Local and CI development remain deterministic through explicit fake adapters.
17. No image bytes, signed URLs, object-store credentials, original filenames, fit notes, or user wardrobe content appear in logs.
18. Lint, strict type checking, tests, production build, and end-to-end smoke tests pass.

## Out of scope

- image editing or background removal;
- AI garment classification;
- automatic tagging;
- face or body analysis;
- public image sharing;
- permanent CDN URLs;
- video uploads;
- bulk imports;
- HEIC/HEIF display transformation;
- choosing a production object-storage or scanner vendor.

## Failure behaviour

- upload initiation failure leaves no reusable credentials;
- abandoned initiated uploads expire and are cleanup candidates;
- storage completion failure keeps the object quarantined or deletes it;
- scanner unavailability results in `failed` or retryable processing, never `ready`;
- rejected media includes a user-safe reason without exposing scanner signatures;
- core wardrobe facts remain usable when object storage or scanning is unavailable.

## Release evidence

- reviewed ADR and threat model;
- migration review;
- policy-condition tests;
- cross-user authorization tests;
- malicious, mismatched, oversized, and missing-object tests;
- signed URL expiry test;
- deletion propagation test;
- CI validation and Security and Privacy Agent review;
- deployment runbook with bucket, CORS, credentials, scanning, cleanup, and rollback controls.
