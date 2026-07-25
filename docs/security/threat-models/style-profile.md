# Threat Model: Private Style Profile

- Date: 2026-07-25
- Owners: Security and Privacy, Product, Architecture
- Related ADR: `docs/architecture/decisions/0005-owner-scoped-style-profile.md`
- Change risk: 3

## Assets

- fit, colour, style, brand, material, and climate preferences;
- optional body measurements;
- measurement-use consent;
- recommendation policy mode;
- profile revision and timestamps;
- exported profile JSON.

## Trust boundaries

1. User browser to Sartoria application.
2. Sartoria application to PostgreSQL.
3. Future recommendation consumers to the Profile module.
4. Export response to the user’s device.
5. Operational systems such as logs, analytics, backups, and support tooling.

## Primary threats and controls

### Cross-user profile access

Threat: a user supplies another account identifier or guesses an export/reset endpoint.

Controls:

- owner identifier comes only from the verified server session;
- transport payloads never accept an owner identifier;
- repository reads, updates, exports, and deletes include owner predicates;
- PostgreSQL forced row-level security adds defence in depth;
- cross-user tests cover known identifiers and stale revisions.

### Lost updates and silent preference changes

Threat: two tabs or agents overwrite one another, or AI changes the profile without clear user action.

Controls:

- optimistic concurrency using expected revision;
- one coherent snapshot update;
- user-visible stale-change message;
- AI and recommendation modules receive read-only profile projections;
- no automatic inference or update path in this slice;
- future suggestions require explicit user acceptance.

### Sensitive measurement exposure

Threat: measurements appear in logs, analytics, support tickets, URLs, or client-visible error details.

Controls:

- POST body and server action input, never query parameters;
- no field-value logging;
- generic validation messages;
- private no-store export response;
- redaction requirements for error reporting and analytics;
- optional measurement collection and separate recommendation-use control.

### Overcollection through location or free text

Threat: the profile collects precise location, medical information, or unrelated sensitive details.

Controls:

- broad climate enum instead of geolocation;
- no unrestricted biography or body-description field;
- bounded brand strings only;
- controlled enums for the remaining preference dimensions;
- product copy explains optional values and purpose.

### Malicious or malformed brand values

Threat: a brand string contains markup, control characters, excessive content, or duplicate/conflicting values.

Controls:

- trim and length bounds;
- reject control characters;
- render as escaped React text;
- deduplicate case-insensitively;
- preferred and avoided brand lists cannot overlap;
- maximum 20 values per list.

### Export disclosure and caching

Threat: profile JSON is cached by a browser, intermediary, shared device, or analytics system.

Controls:

- authenticated owner-scoped endpoint;
- `Cache-Control: private, no-store`;
- `Content-Disposition: attachment`;
- no raw export content in logs;
- filename contains no email or user identifier;
- user guidance notes that downloaded files remain their responsibility.

### Reset confusion or destructive misuse

Threat: a user accidentally resets the profile or a forged request triggers deletion.

Controls:

- authenticated server operation;
- explicit confirmation in the interface;
- owner-scoped deletion;
- CSRF protection inherited from same-site application action boundaries;
- reset affects only the Profile module and not wardrobe, media, or account state;
- idempotent missing-profile result.

### Recommendation misuse

Threat: future recommendation logic treats preferences or measurements as absolute facts or uses measurements without consent.

Controls:

- profile projection includes explicit measurement-use flag;
- missing values remain unknown rather than inferred;
- recommendation mode and exclusions are visible constraints;
- recommendation outputs remain explainable and correctable;
- tests ensure measurements are omitted when use is disabled.

## Required release tests

- cross-user read, update, export, and reset denial;
- stale revision rejection;
- overlapping colour and brand validation;
- duplicate normalization;
- measurement range and consent projection tests;
- private no-store export headers;
- reset confirmation and missing-profile behavior;
- logging and analytics redaction review;
- PostgreSQL row-level security verification with a non-owner application role.

## Residual risk

Downloaded profile exports may be copied outside Sartoria. The interface must clearly describe that export files contain private preferences and optional measurements. Account-wide retention, legal hold, backup deletion, and data-subject workflows remain future cross-module work.
