import { createHmac, randomBytes } from "node:crypto";

import type { RateLimitPolicyName } from "@/lib/rate-limiting/rate-limit-policy";

/**
 * Derivation of rate limit keys.
 *
 * The limiter must be able to tell callers apart without holding anything that
 * identifies them. Every input is therefore reduced to a keyed digest before it
 * reaches a store, and only the digest is retained.
 *
 * The salt is generated per process and never persisted. It cannot be used to
 * correlate a person across restarts or deployments, which is the point:
 * counters are a transient operational mechanism, not a record.
 */

const KEY_LENGTH = 32;

let processSalt: Buffer | undefined;

function salt(): Buffer {
  processSalt ??= randomBytes(32);
  return processSalt;
}

/** Resets the salt. Intended for tests only. */
export function resetRateLimitSaltForTesting(): void {
  processSalt = undefined;
}

function digest(scope: string, value: string, policy: RateLimitPolicyName): string {
  return createHmac("sha256", salt())
    .update(`${policy}\u0000${scope}\u0000${value}`, "utf8")
    .digest("hex")
    .slice(0, KEY_LENGTH);
}

/**
 * Key for an owner-scoped policy.
 *
 * The owner identifier comes from the already-authenticated request, never from
 * a body or query parameter, so a caller cannot choose whose bucket to consume.
 */
export function ownerKey(ownerId: string, policy: RateLimitPolicyName): string {
  return digest("owner", ownerId, policy);
}

/**
 * Key for a client-scoped policy.
 *
 * A forwarding header is honoured only when a trusted proxy is configured.
 * Otherwise it is ignored entirely: an unauthenticated caller could otherwise
 * set a fresh value per request and mint unlimited identities, which would make
 * the limiter trivially bypassable while still appearing to work.
 *
 * When no address can be determined, all such callers share one bucket. That is
 * deliberate. Sharing a bucket degrades gracefully under load; issuing a unique
 * key per unidentifiable caller would silently disable the limit.
 */
export function clientKey(
  input: Readonly<{
    forwardedFor?: string | null;
    socketAddress?: string | null;
    trustProxy?: boolean;
  }>,
  policy: RateLimitPolicyName,
): string {
  const trustProxy =
    input.trustProxy ?? process.env.SARTORIA_TRUST_PROXY_HEADERS?.trim() === "true";

  const forwarded = trustProxy ? firstForwardedAddress(input.forwardedFor) : undefined;
  const address = forwarded ?? input.socketAddress?.trim();

  return digest("client", address && address.length > 0 ? address : "unidentified", policy);
}

/**
 * Takes the left-most entry of a forwarding header, which is the originating
 * client when the header is produced by a trusted proxy chain.
 */
function firstForwardedAddress(header: string | null | undefined): string | undefined {
  const first = header?.split(",")[0]?.trim();

  if (!first || first.length === 0 || first.length > 64) {
    return undefined;
  }

  return first;
}
