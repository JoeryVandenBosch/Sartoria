# Sartoria Security Policy

## Reporting

Do not open public issues for suspected vulnerabilities or exposures involving authentication, authorisation, wardrobe media, personal profile data, secrets, AI provider payloads, or deletion and export workflows.

Report security concerns privately to the repository owner with:

- affected component;
- reproduction steps;
- observed and expected behaviour;
- impact assessment;
- proof of concept that avoids real user data;
- suggested mitigation when available.

## Protected data

Treat the following as sensitive:

- wardrobe images and item metadata;
- measurements and fit notes;
- style, brand, colour, and climate preferences;
- trip, occasion, and calendar context;
- authentication and session data;
- consent, export, and deletion state;
- AI prompts, responses, provider records, and source references;
- secrets, credentials, signed URLs, and administrative audit data.

Sensitive data must not appear in logs, fixtures, screenshots, analytics events, prompts used for development, or public issue content.

## Required controls

- authenticate and authorise every user-owned operation;
- enforce ownership in application use cases and persistence access;
- validate external input and schema-validate AI output;
- use short-lived, purpose-limited media access;
- validate and scan uploads before normal use;
- keep provider secrets in managed secret storage;
- audit administrative and destructive actions;
- support secure export and deletion;
- minimise data sent to external providers;
- preserve deterministic core workflows when AI is unavailable.

## Change risk

Authentication, authorisation, consent, media access, deletion, export, recommendation, AI gateway, migration, infrastructure, and workflow changes are high-risk. They require independent review and explicit validation evidence before release.

## Development data

Do not use production data for development, demos, screenshots, tests, or prompt evaluation without an approved anonymisation process.
