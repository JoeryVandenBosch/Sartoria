/**
 * Provider-neutral rate limiting.
 *
 * Policies are allow-listed. An unknown policy name is a programming error and
 * fails at construction rather than silently permitting unlimited traffic,
 * because a rate limiter that quietly does nothing is worse than none: it looks
 * like protection.
 *
 * See docs/features/0011-bounded-rate-limiting.md.
 */

export const RATE_LIMIT_SCOPES = ["owner", "client"] as const;
export type RateLimitScope = (typeof RATE_LIMIT_SCOPES)[number];

interface PolicyDefinition {
  /** Maximum permitted requests within one window. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
  /** Which identity the counter is keyed on. */
  readonly scope: RateLimitScope;
  /** Environment variable overriding the limit. */
  readonly limitVariable: string;
  /** Environment variable overriding the window. */
  readonly windowVariable: string;
}

/**
 * Defaults are deliberately generous for a private closed beta. They are set to
 * stop abuse and runaway automation, not to ration normal use: a person
 * cataloguing a wardrobe on a Sunday afternoon should never meet one.
 */
export const RATE_LIMIT_POLICIES = {
  /** Authentication attempts. Slows credential guessing without account lockout. */
  "auth.attempt": {
    limit: 10,
    windowSeconds: 300,
    scope: "client",
    limitVariable: "SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS",
    windowVariable: "SARTORIA_RATE_LIMIT_AUTH_WINDOW_SECONDS",
  },

  /** Media upload initiation. Bounds storage and scanner load per owner. */
  "media.upload.initiate": {
    limit: 60,
    windowSeconds: 3_600,
    scope: "owner",
    limitVariable: "SARTORIA_RATE_LIMIT_MEDIA_UPLOADS",
    windowVariable: "SARTORIA_RATE_LIMIT_MEDIA_WINDOW_SECONDS",
  },

  /** Recommendation generation. The most expensive owner-triggered operation. */
  "recommendation.generate": {
    limit: 30,
    windowSeconds: 3_600,
    scope: "owner",
    limitVariable: "SARTORIA_RATE_LIMIT_RECOMMENDATIONS",
    windowVariable: "SARTORIA_RATE_LIMIT_RECOMMENDATION_WINDOW_SECONDS",
  },

  /** Profile export. Bounds bulk retrieval of a person's own data. */
  "profile.export": {
    limit: 10,
    windowSeconds: 3_600,
    scope: "owner",
    limitVariable: "SARTORIA_RATE_LIMIT_PROFILE_EXPORTS",
    windowVariable: "SARTORIA_RATE_LIMIT_PROFILE_EXPORT_WINDOW_SECONDS",
  },

  /**
   * Internal endpoints. Deliberately tight: these are called by operators and
   * workers, never by a person browsing, so a leaked token alone no longer
   * grants unbounded attempts.
   */
  "internal.endpoint": {
    limit: 30,
    windowSeconds: 60,
    scope: "client",
    limitVariable: "SARTORIA_RATE_LIMIT_INTERNAL",
    windowVariable: "SARTORIA_RATE_LIMIT_INTERNAL_WINDOW_SECONDS",
  },
} as const satisfies Record<string, PolicyDefinition>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export function isRateLimitPolicyName(value: unknown): value is RateLimitPolicyName {
  return typeof value === "string" && Object.hasOwn(RATE_LIMIT_POLICIES, value);
}

/** Bounds guarding against a configuration typo producing a useless policy. */
export const MIN_RATE_LIMIT = 1;
export const MAX_RATE_LIMIT = 100_000;
export const MIN_WINDOW_SECONDS = 1;
export const MAX_WINDOW_SECONDS = 86_400;

export interface ResolvedPolicy {
  readonly name: RateLimitPolicyName;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly scope: RateLimitScope;
  /** False when the policy is explicitly disabled by configuration. */
  readonly enabled: boolean;
}

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

function parseBoundedInteger(
  raw: string,
  variable: string,
  minimum: number,
  maximum: number,
): number {
  const value = Number(raw.trim());

  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    // The offending value is deliberately not echoed: configuration content is
    // not something this error should propagate.
    throw new RateLimitConfigurationError(
      `${variable} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

/**
 * Resolves one policy from configuration.
 *
 * Fails closed on malformed configuration: an unparseable limit raises rather
 * than falling back to a default, so a typo cannot silently widen a limit.
 * Disabling is explicit and separate, which keeps intent visible.
 */
export function resolvePolicy(
  name: RateLimitPolicyName,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ResolvedPolicy {
  if (!isRateLimitPolicyName(name)) {
    throw new RateLimitConfigurationError(`Unknown rate limit policy: ${String(name)}`);
  }

  const definition: PolicyDefinition = RATE_LIMIT_POLICIES[name];
  const globallyDisabled = environment.SARTORIA_RATE_LIMIT_DISABLED?.trim() === "true";
  const policyDisabled = environment[`${definition.limitVariable}_DISABLED`]?.trim() === "true";

  const rawLimit = environment[definition.limitVariable]?.trim();
  const rawWindow = environment[definition.windowVariable]?.trim();

  return {
    name,
    limit: rawLimit
      ? parseBoundedInteger(rawLimit, definition.limitVariable, MIN_RATE_LIMIT, MAX_RATE_LIMIT)
      : definition.limit,
    windowSeconds: rawWindow
      ? parseBoundedInteger(
          rawWindow,
          definition.windowVariable,
          MIN_WINDOW_SECONDS,
          MAX_WINDOW_SECONDS,
        )
      : definition.windowSeconds,
    scope: definition.scope,
    enabled: !globallyDisabled && !policyDisabled,
  };
}

export function resolveAllPolicies(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Readonly<Record<RateLimitPolicyName, ResolvedPolicy>> {
  const resolved: Partial<Record<RateLimitPolicyName, ResolvedPolicy>> = {};

  for (const name of Object.keys(RATE_LIMIT_POLICIES) as RateLimitPolicyName[]) {
    resolved[name] = resolvePolicy(name, environment);
  }

  return Object.freeze(resolved) as Readonly<Record<RateLimitPolicyName, ResolvedPolicy>>;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Requests still permitted in the current window. */
  readonly remaining: number;
  /** Seconds until the current window resets. Always a positive integer. */
  readonly resetSeconds: number;
  readonly limit: number;
  /** True when the limiter faulted and the request was permitted regardless. */
  readonly failedOpen: boolean;
}

/**
 * The store a limiter counts in.
 *
 * Implementations receive an already-derived, non-reversible identity key. They
 * never see an address, account identifier, email, or token.
 */
export interface RateLimitStore {
  increment(
    key: string,
    windowSeconds: number,
    now: Date,
  ): Promise<{ readonly count: number; readonly resetSeconds: number }>;
}
