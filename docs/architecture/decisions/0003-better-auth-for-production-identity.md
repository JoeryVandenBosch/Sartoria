# ADR 0003: Better Auth for production identity

- Status: Accepted
- Date: 2026-07-25
- Owners: Architecture, Security and Privacy
- Risk level: 4

## Context

Sartoria stores private wardrobe images, measurements, fit notes, preferences, and recommendation history. Authentication, session management, and authorization must not be implemented as an ad-hoc password or cookie system.

The first wardrobe slice uses a development-only identity adapter that deliberately fails in production. A production identity implementation is required before deployment.

## Decision

Use Better Auth as the initial authentication and session-management library, backed by the same PostgreSQL platform as application data.

- Email and password authentication is enabled for the first deployable release.
- Social, passkey, multi-factor, and enterprise identity methods remain optional future capabilities.
- Better Auth is mounted through the Next.js App Router handler.
- Server-side authorization resolves the verified session for every protected page, action, and media route.
- Proxy checks may improve navigation but never replace page, action, repository, or route authorization.
- Application modules receive only the authenticated Sartoria user identifier; they do not depend on Better Auth types.
- Authentication tables are separated from application-owned tables through explicit migration ownership and naming.
- Secrets, password material, session tokens, and authentication payloads are never logged.
- Production startup fails closed when required authentication or database configuration is absent.
- Development identity remains available only outside production and is visually identified as a development adapter.

## Consequences

### Positive

- Authentication and session security use a maintained specialist library.
- The integration supports Next.js App Router and PostgreSQL without making domain modules depend on the library.
- Future sign-in methods can be added without changing wardrobe ownership rules.

### Costs

- Authentication schema and library upgrades require security review.
- Account verification, password recovery, abuse prevention, and email delivery must be configured before public registration.
- Production deployment requires high-entropy secrets and a reachable PostgreSQL database.

## Rejected alternatives

- Custom password and session implementation: rejected due to unnecessary security risk.
- Authentication only in routing middleware or proxy: rejected because optimistic redirects are not authorization.
- A proprietary identity SDK embedded throughout domain code: rejected because it would weaken portability and testing.

## Release conditions

Public registration remains disabled until email verification, password recovery, rate limiting, abuse monitoring, privacy notices, and operational ownership are configured and reviewed.
