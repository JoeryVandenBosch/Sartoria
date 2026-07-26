# ADR 0010 — Audited one-time staging identity bootstrap

## Status

Accepted for implementation.

## Context

Sartoria keeps public sign-up disabled. A private staging environment still needs one initial owner account and a second isolation-test account. Direct SQL insertion would bypass Better Auth password hashing, hooks, and account invariants. Temporarily enabling public sign-up would create an avoidable exposure window.

## Decision

Provide a dedicated internal bootstrap endpoint that:

- is disabled unless `SARTORIA_OWNER_BOOTSTRAP_ENABLED=true`;
- requires a high-entropy bearer token verified with the existing timing-safe token helper;
- accepts bounded identity and password input for exactly two accounts: the owner and an isolation-test user;
- takes a PostgreSQL advisory transaction lock before reserving bootstrap state;
- refuses to run after any Better Auth user or prior reservation exists;
- creates both accounts through Better Auth server APIs so password hashing and hooks remain intact;
- writes a minimal audit record containing user identifiers and email digests, never passwords or the bearer token;
- returns no session cookies;
- remains pending and fail-closed when either user creation or audit completion fails;
- is removed from the active environment immediately after bootstrap by disabling the flag and deleting the token.

The Better Auth Admin plugin is enabled only to expose the server-side user-creation API. Its browser-facing administrative endpoints remain protected by Better Auth session and role checks. Sartoria does not add an administrative user-management UI in this phase.

## Consequences

- Better Auth migrations must run after enabling the Admin plugin because it adds user administration fields.
- Bootstrap is fail-closed when configuration, database state, token validation, or either account creation is invalid.
- Both accounts use the normal `user` role; Sartoria ownership is based on each authenticated user identifier rather than an application-wide administrator role.
- The isolation account exists only to prove cross-owner denial in staging and must use unique credentials stored outside Git.
