# Private Media Operations

## Purpose

Operate Sartoria wardrobe imagery as private, quarantine-first media. No object is user-readable before validation and malware scanning succeed.

## Required services

- private S3-compatible object bucket;
- PostgreSQL with the Sartoria application migrations applied;
- HTTP-capable processing queue or dispatcher;
- isolated ClamAV service reachable only by the worker path;
- managed secrets, metrics, alerting, backup, and lifecycle cleanup.

## Storage controls

- block all public access;
- disable public ACLs and bucket policies;
- require TLS;
- enable provider-supported encryption at rest;
- restrict the web application to presign, HEAD, signed GET, delete, and approved promotion operations;
- restrict the scanning worker to quarantine reads and approved media processing operations;
- do not grant list-all access unless an approved reconciliation job requires it;
- retain access logs without URL query strings, authorization headers, original filenames, or object content;
- expire abandoned `quarantine/` objects after an approved short retention window;
- do not automatically expire `private/` objects independently of database deletion policy.

## Browser CORS

Allow only the deployed Sartoria origins and the minimum direct-upload method and headers required by the signed POST. Do not use wildcard origins with private production media.

Review CORS whenever deployment origins change.

## Production configuration

Required application values:

- `SARTORIA_MEDIA_MODE=production`
- `MEDIA_S3_BUCKET`
- `MEDIA_S3_REGION`
- optional reviewed `MEDIA_S3_ENDPOINT`
- `MEDIA_S3_FORCE_PATH_STYLE`
- `MEDIA_S3_SERVER_SIDE_ENCRYPTION`
- `MEDIA_PROCESSING_QUEUE_URL`
- `MEDIA_PROCESSING_QUEUE_TOKEN`
- `MEDIA_WORKER_TOKEN`
- `CLAMAV_HOST`
- `CLAMAV_PORT`
- `CLAMAV_TIMEOUT_MS`

Secrets must contain high-entropy values and live in managed secret storage. Queue and worker tokens must be distinct.

## Deployment order

1. Provision private object storage and restricted service identities.
2. Apply bucket public-access, encryption, CORS, and quarantine lifecycle controls.
3. Deploy ClamAV in an isolated network path and verify signature updates.
4. Deploy the protected media worker endpoint.
5. Configure the queue to send owner-scoped `{ mediaId, ownerId }` messages with the worker token.
6. Apply `migrations/0002_wardrobe_media.sql` through `npm run db:migrate`.
7. Deploy the web application with production media configuration.
8. Run the release tests below before enabling uploads.

## Release tests

- accepted JPEG, PNG, and WebP upload;
- HEIC and HEIF secure storage without browser-display promise;
- empty and oversized object rejection;
- declared and detected type mismatch rejection;
- malicious test signature rejection in an isolated non-production environment;
- another user cannot initiate, complete, read, or delete known media identifiers;
- pending and rejected media never receive read URLs;
- signed read URL expires within five minutes;
- deletion removes quarantine and private variants;
- queue retry is idempotent;
- scanner outage leaves media failed or retryable, never ready;
- no sensitive URL, filename, object key, or wardrobe content appears in logs.

## Monitoring

Track counts and latency by safe categorical fields only:

- initiated uploads;
- completion success and rejection code;
- scan queue age;
- scan duration and scanner availability;
- ready, rejected, failed, and deleted transitions;
- storage deletion failures;
- abandoned quarantine cleanup;
- unauthorized media requests.

Alert on growing queue age, repeated scanner failures, deletion failures, unexpected public access findings, and cross-user authorization failures.

## Incident response

For suspected disclosure or scanner bypass:

1. disable upload initiation and signed read URL generation;
2. preserve audit evidence without copying media into tickets or chat;
3. rotate storage, queue, and worker credentials;
4. identify affected opaque media identifiers and owners through approved database access;
5. quarantine or delete affected objects according to incident direction;
6. notify privacy and security owners;
7. document containment, user impact, legal obligations, and recovery evidence.

## Backup and restore

PostgreSQL metadata and private object storage must have aligned recovery objectives. A restore test must confirm that ownership, status, object keys, and deletion state remain consistent. Never restore deleted user media without an approved legal and privacy basis.

## Rollback

Disable new media initiation first. The application may retain existing ready images while the upload and processing path is disabled. Do not roll back database metadata independently of object storage. Use forward migrations or an approved coordinated restore.
