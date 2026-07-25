# Private Wardrobe Media Handoff

## Objective

Deliver the first complete private wardrobe image vertical slice without exposing unscanned media, weakening owner isolation, introducing provider-specific domain dependencies, or making core wardrobe facts depend on media infrastructure.

## Completed scope

- accepted ADR for quarantine-first S3-compatible private media;
- acceptance-ready private media feature specification;
- media threat model and independent Security and Privacy review;
- explicit media domain model and validated lifecycle transitions;
- PostgreSQL media metadata migration with composite item/owner ownership, constraints, indexes, forced row-level security, and owner policy;
- owner-scoped PostgreSQL media repository with conditional expected-status transitions;
- exact-key five-minute quarantine upload policies with declared type, media metadata, encryption, and one-to-20-MiB constraints;
- server-side quarantine object metadata verification;
- binary type detection for JPEG, PNG, WebP, HEIC, and HEIF;
- streaming ClamAV INSTREAM integration with byte limit and enforced timeout;
- quarantine-to-private promotion only after a safe scan;
- protected owner-scoped worker messages and constant-time bearer-token verification;
- production queue dispatcher and deterministic development processing dispatcher;
- five-minute owner-authorised private read URLs for ready media only;
- owner-scoped idempotent deletion of quarantine and private object variants;
- private development upload and read routes that are disabled in production;
- wardrobe item private gallery, processing states, upload control, image display, and deletion control;
- operational runbook covering storage, CORS, scanner, queue, deployment, monitoring, incident response, backup, restore, and rollback;
- tests for lifecycle invariants, ownership denial, upload-policy conditions, metadata rejection, safe and malicious scanning, promotion, deletion, configuration failure, failed initiation cleanup, internal token verification, and end-to-end private image processing.

## Architecture and security artefacts

- `docs/architecture/decisions/0004-quarantine-first-s3-compatible-media.md`
- `docs/features/003-private-wardrobe-media.md`
- `docs/security/threat-models/private-wardrobe-media.md`
- `docs/security/reviews/2026-07-25-private-wardrobe-media.md`
- `docs/operations/private-media.md`

## Validation evidence

GitHub Actions run `30168458037` completed successfully against the final implementation state before release documentation was added.

Passed controls:

- dependency installation;
- ESLint;
- strict TypeScript checking;
- 31 unit and application tests;
- production Next.js build;
- Chromium installation;
- end-to-end wardrobe creation, private image upload, quarantine verification, deterministic secure processing, ready-state rendering, and private image retrieval.

No diagnostic or Playwright ZIP was generated because validation succeeded.

## Resolved implementation findings

- strict response-body and S3 exact-optional-property type failures;
- unstable asynchronous React form reference;
- persistent E2E retry collisions;
- failed upload initiation cleanup;
- ClamAV socket timeout enforcement;
- authenticated route refresh to durable ready state;
- local Playwright origin configuration;
- transient message assertions replaced with durable lifecycle assertions.

## External production boundary

No production object bucket, queue, worker deployment, ClamAV deployment, storage credentials, CORS policy, lifecycle rule, or media migration has been applied to managed infrastructure.

The repository implementation is approved for merge but production media remains blocked until deployment evidence exists.

## Remaining production requirements

- provision and verify a private S3-compatible bucket with blocked public access, TLS, encryption, restrictive CORS, and quarantine cleanup;
- deploy ClamAV with monitored signature updates, isolation, resource limits, and alerting;
- deploy an authenticated retry-safe processing queue and worker route;
- apply and review the media migration using a non-superuser application role that cannot bypass row-level security;
- configure managed secrets, storage/database backup and restore, deletion reconciliation, monitoring, and incident ownership;
- run deployed cross-user, malicious, malformed, oversized, timeout, replay, retry, deletion-failure, and orphan-reconciliation tests;
- obtain explicit human approval before enabling production uploads.

## Exact next action

Merge the validated private-media foundation, then begin Phase 3 with a product and privacy specification for fit, colour, style, brand, climate, and recommendation-control preferences, including user correction, export, deletion, and data-minimisation boundaries.
