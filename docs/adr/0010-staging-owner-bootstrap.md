# ADR 0010 — Audited one-time staging owner bootstrap

## Status

Accepted for implementation.

## Context

Sartoria keeps public sign-up disabled. A private staging environment still needs one initial owner account and a second isolation-test account. Direct SQL insertion would bypass Better Auth password hashing, hooks, and account invariants. Temporarily enabling public sign-up would create an avoidable exposure window.

## Decision

Provide a dedicated internal bootstrap endpoint that:

- is disabled unless `SARTORIA_OWNER_BOOTSTRAP_ENABLED=true`;
- requires a high-entropy bearer token verified with the existing timing-safe token helper;
- accepts only bounded name, email, and password input;
- takes a PostgreSQL advisory transaction lock before checking bootstrap state;
- refuses to run after any Better Auth user already exists;
- creates the account through Better Auth server APIs so password hashing and hooks remain intact;
- writes a minimal audit record without storing the password or bearer token;
- returns no session cookie;
- is removed from the active environment immediately after bootstrap by disabling the flag and deleting the token.

The Better Auth Admin plugin is enabled only to expose the server-side user-creation API. Its browser-facing administrative endpoints remain protected by Better Auth session and role checks. Sartoria does not add an administrative user-management UI in this phase.

## Consequences

- Better Auth migrations must run after enabling the Admin plugin because it adds user administration fields.
- Bootstrap is fail-closed when configuration, database state, or token validation is invalid.
- The first account is created with the normal `user` role; Sartoria ownership is based on the authenticated user identifier rather than an application-wide administrator role.
- A second test account must be created through a separately approved procedure after the initial bootstrap, without enabling public sign-up.
