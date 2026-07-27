import { NextResponse } from "next/server";

import { getOperationalEventEmitter } from "@/lib/observability/operational-event-runtime";
import { clientKey, ownerKey } from "@/lib/rate-limiting/rate-limit-identity";
import { getRateLimiter, rateLimitHeaders } from "@/lib/rate-limiting/rate-limiter";
import type { RateLimitPolicyName } from "@/lib/rate-limiting/rate-limit-policy";

/**
 * Transport-level enforcement.
 *
 * Returns a prepared `429` when a request must be refused, and otherwise the
 * headers to attach to a successful response. A route therefore adds two lines
 * and its behaviour on the permitted path is unchanged.
 */

export interface EnforcementResult {
  /** Present only when the request must be refused. */
  readonly refusal?: NextResponse;
  readonly headers: Record<string, string>;
}

function refusal(headers: Record<string, string>): NextResponse {
  return NextResponse.json(
    // Deliberately uninformative: the response reveals nothing about other
    // callers, configured limits beyond the standard headers, or system state.
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: { ...headers, "cache-control": "no-store" },
    },
  );
}

export async function enforceOwnerRateLimit(
  policy: RateLimitPolicyName,
  ownerId: string,
): Promise<EnforcementResult> {
  const decision = await getRateLimiter().check(policy, ownerKey(ownerId, policy));
  const headers = rateLimitHeaders(decision);

  return decision.allowed ? { headers } : { refusal: refusal(headers), headers };
}

export async function enforceClientRateLimit(
  policy: RateLimitPolicyName,
  request: Readonly<{ headers: Headers }>,
): Promise<EnforcementResult> {
  const key = clientKey(
    {
      forwardedFor: request.headers.get("x-forwarded-for"),
      // Next.js does not expose the socket address to a route handler, so a
      // client-scoped policy is enforceable only behind a trusted proxy.
      socketAddress: null,
    },
    policy,
  );

  if (key === undefined) {
    // Callers cannot be told apart, so the policy is unenforceable. The request
    // is permitted and the gap is reported. Applying a shared bucket instead
    // would let one caller exhaust it and lock out everyone, turning a
    // protection into a denial-of-service vector.
    getOperationalEventEmitter().emit({
      name: "rate.limit.evaluated",
      severity: "warning",
      outcome: "degraded",
      attributes: { policy, decision: "unenforceable", failureClassification: "configuration" },
    });

    return { headers: {} };
  }

  const decision = await getRateLimiter().check(policy, key);
  const headers = rateLimitHeaders(decision);

  return decision.allowed ? { headers } : { refusal: refusal(headers), headers };
}

/** Re-exported so routes need only one import. */
export { getOperationalEventEmitter };
