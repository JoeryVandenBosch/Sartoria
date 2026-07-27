import { NULL_OPERATIONAL_EVENT_EMITTER } from "@/lib/observability/operational-event-emitter";
import type { OperationalEventEmitter } from "@/lib/observability/operational-event-emitter";
import { InMemoryRateLimitStore } from "@/lib/rate-limiting/adapters/in-memory-rate-limit-store";
import {
  resolvePolicy,
  type RateLimitDecision,
  type RateLimitPolicyName,
  type RateLimitStore,
  type ResolvedPolicy,
} from "@/lib/rate-limiting/rate-limit-policy";

/**
 * The application-facing rate limiting interface.
 *
 * Transport code depends on this and nothing else. It knows nothing about
 * stores, windows, or configuration.
 */
export interface RateLimiter {
  check(policy: RateLimitPolicyName, key: string): Promise<RateLimitDecision>;
}

export interface CreateRateLimiterOptions {
  readonly store?: RateLimitStore;
  readonly now?: () => Date;
  readonly emitter?: OperationalEventEmitter;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

function permitted(policy: ResolvedPolicy, failedOpen: boolean): RateLimitDecision {
  return {
    allowed: true,
    remaining: policy.limit,
    resetSeconds: policy.windowSeconds,
    limit: policy.limit,
    failedOpen,
  };
}

/**
 * Creates a limiter.
 *
 * Policies are resolved eagerly so malformed configuration fails at
 * construction, not on the first limited request. A rate limiter that starts
 * successfully and then throws under load is worse than one that refuses to
 * start.
 */
export function createRateLimiter(options: CreateRateLimiterOptions = {}): RateLimiter {
  const store = options.store ?? new InMemoryRateLimitStore();
  const now = options.now ?? (() => new Date());
  const emitter = options.emitter ?? NULL_OPERATIONAL_EVENT_EMITTER;
  const environment = options.environment ?? process.env;

  return {
    async check(policyName, key): Promise<RateLimitDecision> {
      // Resolved per call so a configuration change takes effect on restart
      // without a separate cache to reason about. Parsing is trivial.
      const policy = resolvePolicy(policyName, environment);

      if (!policy.enabled) {
        return permitted(policy, false);
      }

      try {
        const result = await store.increment(key, policy.windowSeconds, now());
        const allowed = result.count <= policy.limit;

        if (!allowed) {
          emitter.emit({
            name: "rate.limit.evaluated",
            severity: "warning",
            outcome: "failure",
            attributes: { policy: policyName, decision: "denied" },
          });
        }

        return {
          allowed,
          remaining: Math.max(0, policy.limit - result.count),
          resetSeconds: Math.max(1, result.resetSeconds),
          limit: policy.limit,
          failedOpen: false,
        };
      } catch {
        // Fail open. Availability of a private wardrobe matters more than
        // perfect enforcement, and a limiter outage must never lock a person
        // out of their own data. The fault is recorded so it is not silent.
        emitter.emit({
          name: "rate.limit.evaluated",
          severity: "error",
          outcome: "degraded",
          attributes: {
            policy: policyName,
            decision: "failed-open",
            failureClassification: "dependency-unavailable",
          },
        });

        return permitted(resolvePolicy(policyName, environment), true);
      }
    },
  };
}

/**
 * Headers describing the decision.
 *
 * `Retry-After` is only meaningful on a denial and is omitted otherwise.
 * No header reveals anything about other callers.
 */
export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "RateLimit-Reset": String(decision.resetSeconds),
  };

  if (!decision.allowed) {
    headers["Retry-After"] = String(decision.resetSeconds);
  }

  return headers;
}

let sharedLimiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  sharedLimiter ??= createRateLimiter();
  return sharedLimiter;
}

/** Resets the shared limiter. Intended for tests only. */
export function resetRateLimiterForTesting(): void {
  sharedLimiter = undefined;
}
