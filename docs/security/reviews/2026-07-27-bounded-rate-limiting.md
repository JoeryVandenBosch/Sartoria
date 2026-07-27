# Security and privacy review — bounded rate limiting

**Feature:** `docs/features/0011-bounded-rate-limiting.md`
**Risk level:** 3
**Date:** 2026-07-27
**Reviewer:** implementing agent (Claude, deep tier)

> Implementer self-review. `AI_AGENTS.md` requires independent review at risk level 3; that review is outstanding and blocking. This document exists to make it cheap, not to replace it.

## Scope

Adds enforcement at five surfaces. No change to authentication logic, authorisation, data model, migrations, storage, or any successful-path response body.

## Threat model

### T1 — Rate limiting becomes a denial-of-service vector

**Severity: high.** This is the most serious risk in the feature and the one the original specification got wrong.

The first draft grouped indistinguishable callers into a single bucket. With ten authentication attempts per five minutes shared across everyone, one caller could exhaust the bucket and lock out every legitimate person. The protection would have been strictly worse than no protection, and it contradicted the feature's own acceptance criterion 11.

**Mitigation.** A client-scoped policy with no determinable identity is unenforceable: the request is permitted and an operational event reports the gap. Client-scoped protection requires a trusted proxy, which is stated in the specification and prominently in operations guidance.

**Residual risk.** A deployment without a trusted proxy has no authentication rate limiting. This is visible in telemetry rather than silent, and is the correct trade against locking users out.

**Verification.** `tests/rate-limiting/rate-limiter.test.ts` asserts no key is derived when callers cannot be told apart, and that one limited identity does not affect another.

### T2 — Limiter bypass through a forged forwarding header

**Severity: high.** An attacker varying `X-Forwarded-For` per request could mint unlimited identities, defeating the limit while it still appeared to work.

**Mitigation.** The header is honoured only when `SARTORIA_TRUST_PROXY_HEADERS=true`. Otherwise it is ignored entirely. Only the left-most entry is taken, and values over 64 characters are rejected.

**Verification.** Tested: a spoofed header produces the same key as no header when no proxy is trusted, and distinct keys when one is.

### T3 — Limiter state exposes personal data

**Severity: medium.** Counters keyed on addresses or account identifiers would create a record of who used the system and when.

**Mitigation.** Every input is reduced to an HMAC digest before reaching a store, using a per-process salt that is never persisted. State holds a digest, a counter, and an expiry. Counters cannot correlate a person across restarts.

**Verification.** Tested: a derived key contains no fragment of its input and matches a 32-character hex pattern. Emitted events are asserted not to contain the key material.

### T4 — Limiter fault blocks legitimate access

**Severity: medium.** A limiter that fails closed would deny people access to their own wardrobes during an unrelated fault.

**Mitigation.** Fail open, with the fault recorded. Availability of a private wardrobe outweighs perfect enforcement.

**Residual risk.** A store fault is an unprotected window. Accepted, and visible in telemetry.

### T5 — Silent misconfiguration disables protection

**Severity: medium.** A typo in a limit variable falling back to a default, or a policy name that no longer exists, would leave a surface unprotected while appearing configured.

**Mitigation.** Malformed configuration raises at construction rather than defaulting. Policy names are allow-listed. Disabling is explicit and separate from limit configuration, so intent is visible.

**Verification.** Tested against non-numeric, zero, negative, fractional, and absurd values. The error deliberately does not echo the offending value.

### T6 — Counter collision between policies

**Severity: medium.** Two policies sharing a counter would cause one surface's traffic to exhaust another's budget.

**Mitigation.** The limiter namespaces store keys by policy internally, so isolation does not depend on callers deriving per-policy keys.

**Note.** This was found by a test, not by review. The first implementation namespaced only inside the identity helpers, so any caller passing a raw key would have collided. The fix moved the guarantee into the limiter, where it is structural.

### T7 — Unbounded memory growth

**Severity: medium.** An attacker generating many distinct identities could exhaust memory.

**Mitigation.** Expired entries are swept opportunistically, and a maximum tracked-key count is enforced. On saturation the soonest-expiring entries are dropped: brief under-counting rather than unbounded growth. The sweep holds no timer, so it cannot keep a process alive.

**Verification.** Tested for both eviction and the maximum key count.

### T8 — Account lockout used as harassment

**Severity: medium, avoided by design.** Lockout after failed attempts would let anyone who knows an email address deny that person access to their own wardrobe.

**Mitigation.** No lockout exists. Attempts are slowed, never blocked permanently, and limits are keyed on client identity rather than on the account being targeted.

### T9 — Enforcement response leaks system state

**Severity: low.**

**Mitigation.** A refusal returns a fixed message and standard headers only. No configured limit beyond the standard headers, no counter, no information about other callers.

## Data classification

| Field | Classification | Justification |
|---|---|---|
| store key | pseudonymous, ephemeral | keyed digest, unsalted value never retained, salt not persisted |
| counter, expiry | non-personal | integers |
| event attributes | non-personal | policy name and decision from fixed vocabularies |

No field is personal data. Limiter state is not subject to erasure requests and requires no deletion propagation.

## Findings

No high or medium findings remain open.

**Low — L1.** Fixed windows permit up to twice the limit across a window boundary. Accepted: a sliding window adds real complexity for a burst tolerance that does not matter at private-wardrobe scale.

**Low — L2.** `auth.attempt` limits POST only. GET carries session and metadata reads a signed-in person makes routinely, and limiting those would degrade normal use without raising the cost of guessing.

**Low — L3.** The per-process salt means a restart resets counters. Intentional, and a mild weakening under repeated restarts. Acceptable because the alternative is persisting identity material.

## Conclusion

The most important outcome of this review was catching a design error in the feature's own specification before implementation: the original bucketing behaviour would have created a denial-of-service vector against every user. It has been corrected in the specification and the implementation, and the corrected behaviour is covered by test.

Recommended for independent review. No blocking security or privacy defect identified.
