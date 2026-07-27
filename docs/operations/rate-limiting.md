# Rate limiting operations

Bounded protection for authentication, owner-triggered work, and internal endpoints. See `docs/features/0011-bounded-rate-limiting.md` for the specification and ADR 0011 for the shared-boundary rationale it builds on.

## Two constraints to read before deploying

**Client-scoped policies require a trusted proxy.** Next.js does not expose the socket address to a route handler, so `auth.attempt` and `internal.endpoint` can only distinguish callers when a proxy sets a forwarding header and `SARTORIA_TRUST_PROXY_HEADERS=true` is configured. Without it those two policies report themselves *unenforceable* and permit every request.

This is deliberate. Grouping indistinguishable callers into one bucket would let a single caller exhaust the shared authentication limit and lock out everyone — a denial-of-service vector, worse than no limit at all. Permitting and reporting makes the gap visible instead of harmful.

Watch for this signal after any deployment change:

```
{"name":"rate.limit.evaluated","outcome":"degraded","attributes":{"policy":"auth.attempt","decision":"unenforceable",...}}
```

Seeing it means authentication is not rate limited.

**The store is single-instance only.** Counters live in process memory. Behind a load balancer each instance counts independently, so the effective limit is multiplied by the instance count. Acceptable for a single-instance closed beta and strictly better than nothing, but a shared store must be approved through an ADR before horizontal scaling. The interface exists so that change touches no protected surface.

## Policies and defaults

Defaults are set to stop abuse and runaway automation, not to ration normal use. Someone cataloguing a wardrobe on a Sunday afternoon should never meet one.

| Policy | Default | Window | Scope | Protects |
|---|---|---|---|---|
| `auth.attempt` | 10 | 5 min | client | credential guessing |
| `media.upload.initiate` | 60 | 1 hour | owner | storage and scanner load |
| `recommendation.generate` | 30 | 1 hour | owner | the most expensive owner-triggered operation |
| `profile.export` | 10 | 1 hour | owner | bulk retrieval |
| `internal.endpoint` | 30 | 1 min | client | token guessing against internal routes |

## Configuration

| Variable | Purpose |
|---|---|
| `SARTORIA_TRUST_PROXY_HEADERS` | `true` enables client-scoped policies. Set only behind a proxy you control. |
| `SARTORIA_RATE_LIMIT_DISABLED` | `true` disables every policy |
| `SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS` | limit override |
| `SARTORIA_RATE_LIMIT_AUTH_WINDOW_SECONDS` | window override |
| `SARTORIA_RATE_LIMIT_MEDIA_UPLOADS` / `..._MEDIA_WINDOW_SECONDS` | limit and window |
| `SARTORIA_RATE_LIMIT_RECOMMENDATIONS` / `..._RECOMMENDATION_WINDOW_SECONDS` | limit and window |
| `SARTORIA_RATE_LIMIT_PROFILE_EXPORTS` / `..._PROFILE_EXPORT_WINDOW_SECONDS` | limit and window |
| `SARTORIA_RATE_LIMIT_INTERNAL` / `..._INTERNAL_WINDOW_SECONDS` | limit and window |
| `<LIMIT_VARIABLE>_DISABLED` | `true` disables one policy, e.g. `SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS_DISABLED` |

Malformed configuration raises at construction rather than falling back to a default. A typo that would silently widen a limit stops the application instead, because a limiter that quietly permits everything is worse than none: it looks like protection.

## What a caller sees

Permitted requests are unchanged apart from three headers:

```
RateLimit-Limit: 60
RateLimit-Remaining: 43
RateLimit-Reset: 2871
```

A refused request receives `429` with `Retry-After` in seconds and a deliberately uninformative body:

```json
{"error":"Too many requests. Try again shortly."}
```

No response reveals anything about other callers or system state.

## Interpreting signals

**`decision: denied`** — a caller hit a limit. Isolated occurrences are normal. Sustained denials on `auth.attempt` suggest credential guessing; on owner-scoped policies they usually mean automation, not a person.

**`decision: failed-open`** — the store faulted and the request was permitted. Availability of a private wardrobe matters more than perfect enforcement, and a limiter outage must never lock someone out of their own data. Investigate, but user impact is nil.

**`decision: unenforceable`** — see the first constraint above. A deployment gap, not a runtime fault.

Events carry the policy and outcome only. They never contain an address, address digest, owner identifier, counter value, or limit configuration.

## Tuning

Raise a limit when legitimate use meets it. Evidence comes from `denied` events on owner-scoped policies with no corresponding abuse pattern.

Do not tune `auth.attempt` upward to resolve complaints without establishing the cause; a person who cannot sign in usually has a password problem, not a limit problem, and Sartoria deliberately has no account lockout to point at.

## Rollback

1. **Disable one policy** — `SARTORIA_RATE_LIMIT_<POLICY>_DISABLED=true`, restart. No deployment.
2. **Disable everything** — `SARTORIA_RATE_LIMIT_DISABLED=true`. Returns every surface to previous behaviour.
3. **Revert the slice** — enforcement holds no domain state, so removal requires no migration.

**Do not roll back by raising limits to an effectively unlimited value.** Disable the policy explicitly so the intent is visible in configuration rather than hidden in a large number.

## Privacy

Limiter state holds a keyed digest, a counter, and an expiry. Nothing else.

Identities are hashed with a per-process salt that is never persisted, so counters cannot correlate a person across restarts or deployments. Counters are a transient operational mechanism, not a record, and contain no personal data.

## Deliberate exclusions

- **No account lockout.** Lockout lets anyone who knows an email address deny that person access to their own wardrobe. Slow guessing is the lesser harm.
- **No IP blocklists, reputation, or geolocation.**
- **No CAPTCHA, proof of work, or device fingerprinting.**
- **No sliding window or token bucket.** Fixed windows permit a burst at a boundary; at private-wardrobe scale the added complexity is not worth removing that.
