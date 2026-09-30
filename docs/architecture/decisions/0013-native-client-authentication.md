# ADR 0013 — Native client authentication and API contract

## Status

Accepted for implementation. Phase 7C slice 1. Security-sensitive: requires independent risk-level-3 review before merge.

## Context

ADR 0012 makes Sartoria a native application served by this repository's HTTP API. The current authentication model assumes a browser: Better Auth issues an HTTP-only session cookie, Next.js server components read it, and every API route resolves identity through `getCurrentUserId()`, which reads that cookie.

A native client has no browser cookie jar in the sense the server assumes. It also cannot be forced to update in step with the server, so the API it calls must remain stable across client versions.

Two further facts shape the decision:

- Better Auth 1.6 ships a `bearer` plugin that issues the session token in a response header on sign-in and accepts it back as `Authorization: Bearer` on subsequent requests. It reuses the same server-side session store and expiry as cookie sessions.
- All 24 existing API routes resolve identity through exactly one function. Extending that function extends every route.

Four user flows — wardrobe, recommendations, outfit creation, insights — currently exist only as Next.js server actions, which a native client cannot call. They must gain HTTP routes.

## Decision

### 1. Bearer tokens via Better Auth's `bearer` plugin, not a custom scheme

Sartoria does not implement its own token format, signing, rotation, or storage. The `bearer` plugin is enabled alongside the existing cookie behaviour. A sign-in response carries the session token in the `set-auth-token` header; the native client sends it back as `Authorization: Bearer <token>`.

The token **is** the server-side session identifier. Revoking the session revokes the token. Session expiry, refresh, and `revokeSessionsOnPasswordReset` apply unchanged. No second credential system is introduced.

Rejected: a custom JWT scheme. It would introduce key management, rotation, clock-skew handling, and a revocation problem that opaque server-side sessions do not have, in exchange for stateless verification that a single-instance closed beta does not need.

### 2. One identity resolution function, two transports

`getCurrentUserId()` gains bearer resolution. Better Auth's `getSession` already inspects the `Authorization` header when the bearer plugin is active, so the change is to pass the request headers through rather than only the cookie store. Cookie sessions continue to work for the retained web interface.

Consequence: every existing route becomes native-callable with no per-route change, and the observability event `auth.session.resolved` keeps a single emission point.

### 3. Client-side token storage is the client's responsibility, and the server constrains it

The server issues the token; the native client must store it in the iOS Keychain via `expo-secure-store`, never in `AsyncStorage` or a plain file. This is recorded here because the server cannot enforce it, and a future client author must not discover it by accident.

### 4. API versioning by URL prefix

New routes created for the native client live under `/api/v1/`. Existing routes stay where they are for the web interface and are not moved in this slice, to avoid breaking the retained reference.

A breaking change to a `v1` route requires a `v2` route; `v1` is kept until no supported client version calls it. Additive changes (new optional fields) do not require a version bump.

Rejected: header-based versioning. It is harder to observe in logs and harder to route in a reverse proxy.

### 5. Routes are thin transport over existing application code

Each new route validates input with the transport schema that the corresponding server action already uses, calls the same application function, and shapes the response. No business logic lives in a route. This is verified by an architecture guard: route files may not import from `src/modules/*/domain`.

### 6. Error responses are bounded

A route returns one of a fixed set of shapes. No error response carries an exception message, a stack, a query, or an internal identifier. Validation failures return field-level errors from the schema, which name fields the client already knows.

### 7. Rate limiting and observability apply unchanged

Feature 0011's owner-scoped policies apply to the new routes through the same `enforceOwnerRateLimit` helper. Feature 0010 emission is unchanged, since identity resolution is the single emission point.

## Consequences

- The web interface is unaffected: cookie sessions keep working.
- A leaked bearer token is equivalent to a leaked session cookie and is mitigated the same way: server-side revocation. It is not equivalent to a leaked password.
- The bearer plugin exposes the token to JavaScript on the client by design. That is acceptable for a native application with Keychain storage; it would not be acceptable for a browser, which is why the web interface keeps cookies.
- Sign-up remains disabled. Bearer authentication does not open a registration path.
- Two deployable surfaces now exist with independent versioning. Removing a `v1` route is a breaking change and requires evidence that no supported client calls it.

## Verification required before merge

- A bearer token obtained from sign-in authenticates a `v1` request; a missing, malformed, expired, or revoked token is refused with `401` and no body detail.
- Cookie authentication for the web interface is unchanged, proven by the existing end-to-end suite.
- Owner isolation holds over bearer: a token for owner A cannot read or write owner B's data.
- `auth.session.resolved` emits exactly once per request for bearer and for cookie.
- No route file imports a domain module, enforced by test.
- Independent review of this ADR and the implementing diff.
