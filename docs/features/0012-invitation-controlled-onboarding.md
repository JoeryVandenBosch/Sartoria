# Feature 0012 — Invitation-controlled onboarding

## Status

Specified. Third Phase 7B implementation slice. **Implementation deliberately not started; see "Sequencing" below.**

## Objective

Allow named people to be admitted to a private Sartoria deployment through single-use, expiring invitations, without ever enabling public sign-up, and with a complete audit trail that records no credential material.

## User and operator outcome

- An operator can admit a specific person without opening registration to anyone.
- An invited person can create exactly one account from an invitation, once.
- An unredeemed invitation can be revoked, and expires on its own if forgotten.
- A leaked invitation is bounded in blast radius: one account, one window, revocable.
- Every issuance, redemption, expiry, and revocation is auditable without storing an email address in plain text or a token in any form.
- Owner isolation is unaffected: an invited person sees only their own wardrobe.

## In scope

- invitation domain with explicit lifecycle states: `issued`, `redeemed`, `revoked`, `expired`;
- single-use enforcement under concurrency;
- operator-triggered issuance through an internal, token-protected endpoint;
- redemption flow that creates an account through Better Auth server APIs, preserving password hashing and hooks;
- bounded expiry with a documented default and per-invitation override;
- revocation of an unredeemed invitation;
- audit records holding an email digest, lifecycle timestamps, and an operator reference, never an address or token;
- rate limiting of redemption attempts through Feature 0011;
- bounded operational events through Feature 0010;
- deterministic development adapters;
- tests covering lifecycle, single use, expiry, revocation, concurrency, and owner isolation;
- operations guidance, security review, and rollback.

## Explicitly out of scope

- public sign-up, in any form, under any flag;
- self-service invitation requests or waitlists;
- referral, viral, or invite-a-friend mechanics;
- email delivery. Invitations are handed to the operator, who delivers them out of band. Adding a mail provider is a separate decision requiring its own ADR and privacy review;
- roles, permissions, or administrative user management beyond what already exists;
- organisations, teams, or shared wardrobes;
- account recovery, password reset, or email verification, which remain separate slices.

## Architecture constraints

- Domain modules do not import authentication, observability, or rate limiting implementations.
- The invitation token is never stored. Only a digest is persisted, so a database disclosure cannot yield a usable invitation.
- Tokens are high-entropy and generated server-side. An invitation identifier is not a token and must not be usable to redeem.
- Redemption is atomic. Two concurrent redemptions of the same invitation must result in exactly one account, enforced in the database rather than in application logic.
- Redemption failure is fail-closed: no account, no partial state.
- Comparison of a supplied token against a stored digest uses a timing-safe comparison, consistent with the existing internal token helper.
- Public sign-up remains disabled. Redemption is a distinct path that requires a valid invitation and cannot be reached without one.
- Audit records contain no email address, token, password, or session material.

## Threats this feature must address

| Threat | Required mitigation |
|---|---|
| Invitation reused to create several accounts | atomic single-use enforcement in the database |
| Invitation leaked or forwarded | short expiry, revocation, one account maximum |
| Token guessed | high entropy, rate-limited redemption, timing-safe comparison |
| Database disclosure yields usable invitations | store a digest, never the token |
| Redemption used to enumerate valid emails | identical response and timing for unknown, expired, revoked, and already-redeemed invitations |
| Operator endpoint abused | existing internal token protection plus Feature 0011 limiting |

The enumeration mitigation is a deliberate usability cost: a person with a genuinely expired invitation receives the same unhelpful message as an attacker probing. Operators must be able to tell them apart from audit records, which is why lifecycle states are recorded even though they are never disclosed to the caller.

## Acceptance criteria

1. An issued invitation can be redeemed exactly once, producing exactly one account.
2. Two concurrent redemptions of the same invitation produce one account and one failure, proven by test against the real persistence adapter.
3. An expired invitation cannot be redeemed, verified with an injected clock.
4. A revoked invitation cannot be redeemed, and revocation of a redeemed invitation is refused.
5. Unknown, expired, revoked, and already-redeemed invitations produce an identical caller-visible response.
6. No stored record contains an invitation token, a password, or a plain-text email address.
7. Redemption attempts are rate limited, and exhausting the limit does not reveal whether an invitation exists.
8. Public sign-up remains unreachable, proven by test.
9. An account created through redemption is owner-isolated and sees no other person's wardrobe.
10. Issuance requires the existing internal token and is refused without it.
11. Lint, strict TypeScript, unit and application tests, production build, standalone artifact, and Chromium E2E are green.
12. Architecture, Security, Privacy, Operations, and Documentation review evidence is recorded.

## Rollback

- Issuance can be disabled through configuration, leaving existing invitations redeemable or not as the operator chooses.
- Redemption can be disabled independently, closing the deployment to new accounts without affecting existing ones.
- Invitation records are additive. Disabling the feature strands unredeemed invitations harmlessly; they expire on their own.
- Do not roll back by lengthening expiry or removing single-use enforcement.

## Sequencing

This feature depends on Feature 0010 for audit events and Feature 0011 for redemption limiting. Both are implemented but unmerged, and both await the independent review that risk level 3 requires.

Implementing this slice before that review clears would create a three-deep branch stack holding more than five thousand lines of unreviewed work, where a single review finding in the foundation would require rebasing every layer above it. That is a poor trade for momentum.

This specification is therefore written and merged ahead of implementation, so the design is reviewable now and implementation can begin immediately once the foundation clears.
