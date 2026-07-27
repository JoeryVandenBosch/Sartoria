import { describe, expect, it } from "vitest";

import { InMemoryOperationalEventSink } from "@/lib/observability/adapters/in-memory-operational-event-sink";
import { createOperationalEventEmitter } from "@/lib/observability/operational-event-emitter";
import { InMemoryRateLimitStore } from "@/lib/rate-limiting/adapters/in-memory-rate-limit-store";
import {
  clientKey,
  ownerKey,
  resetRateLimitSaltForTesting,
} from "@/lib/rate-limiting/rate-limit-identity";
import {
  createRateLimiter,
  rateLimitHeaders,
} from "@/lib/rate-limiting/rate-limiter";
import {
  RateLimitConfigurationError,
  RATE_LIMIT_POLICIES,
  isRateLimitPolicyName,
  resolveAllPolicies,
  resolvePolicy,
} from "@/lib/rate-limiting/rate-limit-policy";

const START = new Date("2026-01-01T00:00:00.000Z");

function clock(startAt: Date = START) {
  let current = startAt.getTime();

  return {
    now: () => new Date(current),
    advanceSeconds(seconds: number) {
      current += seconds * 1_000;
    },
  };
}

function limiterWith(
  environment: Record<string, string | undefined> = {},
  store = new InMemoryRateLimitStore(),
  time = clock(),
) {
  const sink = new InMemoryOperationalEventSink();

  return {
    sink,
    store,
    time,
    limiter: createRateLimiter({
      store,
      now: time.now,
      environment,
      emitter: createOperationalEventEmitter({ sink, environment: "test", now: time.now }),
    }),
  };
}

/** Acceptance criteria 1 and 2. */
describe("limit enforcement", () => {
  it("permits requests up to the configured limit", async () => {
    const { limiter } = limiterWith({ SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "3" });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const decision = await limiter.check("auth.attempt", "key-a");
      expect(decision.allowed).toBe(true);
      expect(decision.remaining).toBe(3 - attempt);
    }
  });

  it("denies the request immediately after the limit with a positive Retry-After", async () => {
    const { limiter } = limiterWith({ SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "2" });

    await limiter.check("auth.attempt", "key-a");
    await limiter.check("auth.attempt", "key-a");
    const denied = await limiter.check("auth.attempt", "key-a");

    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.resetSeconds).toBeGreaterThan(0);
    expect(Number.isInteger(denied.resetSeconds)).toBe(true);

    const headers = rateLimitHeaders(denied);
    expect(headers["Retry-After"]).toBe(String(denied.resetSeconds));
    expect(headers["RateLimit-Limit"]).toBe("2");
    expect(headers["RateLimit-Remaining"]).toBe("0");
  });

  it("omits Retry-After when the request is permitted", async () => {
    const { limiter } = limiterWith();
    const headers = rateLimitHeaders(await limiter.check("auth.attempt", "key-a"));

    expect(headers["Retry-After"]).toBeUndefined();
  });
});

/** Acceptance criterion 3. */
describe("counter isolation", () => {
  it("keeps counters separate between identities", async () => {
    const { limiter } = limiterWith({ SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "1" });

    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(true);
    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(false);

    // Acceptance criterion 11: another person is unaffected.
    expect((await limiter.check("auth.attempt", "key-b")).allowed).toBe(true);
  });

  it("keeps counters separate between policies", async () => {
    const { limiter } = limiterWith({
      SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "1",
      SARTORIA_RATE_LIMIT_PROFILE_EXPORTS: "1",
    });

    expect((await limiter.check("auth.attempt", "shared")).allowed).toBe(true);
    expect((await limiter.check("auth.attempt", "shared")).allowed).toBe(false);
    expect((await limiter.check("profile.export", "shared")).allowed).toBe(true);
  });
});

/** Acceptance criterion 4. */
describe("window expiry", () => {
  it("resets the counter once the window elapses", async () => {
    const time = clock();
    const { limiter } = limiterWith(
      { SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "1", SARTORIA_RATE_LIMIT_AUTH_WINDOW_SECONDS: "60" },
      new InMemoryRateLimitStore(),
      time,
    );

    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(true);
    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(false);

    time.advanceSeconds(59);
    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(false);

    time.advanceSeconds(2);
    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(true);
  });

  it("reports a shrinking reset as the window elapses", async () => {
    const time = clock();
    const { limiter } = limiterWith(
      { SARTORIA_RATE_LIMIT_AUTH_WINDOW_SECONDS: "100" },
      new InMemoryRateLimitStore(),
      time,
    );

    const first = await limiter.check("auth.attempt", "key-a");
    time.advanceSeconds(40);
    const later = await limiter.check("auth.attempt", "key-a");

    expect(later.resetSeconds).toBeLessThan(first.resetSeconds);
  });
});

/** Acceptance criterion 5. */
describe("fail open", () => {
  it("permits the request when the store faults and records exactly one event", async () => {
    const { limiter, sink } = limiterWith({}, new InMemoryRateLimitStore({ failOnIncrement: true }));

    const decision = await limiter.check("media.upload.initiate", "key-a");

    expect(decision.allowed).toBe(true);
    expect(decision.failedOpen).toBe(true);

    const events = sink.eventsNamed("rate.limit.evaluated");
    expect(events).toHaveLength(1);
    expect(events[0]?.attributes).toEqual({
      policy: "media.upload.initiate",
      decision: "failed-open",
      failureClassification: "dependency-unavailable",
    });
  });

  it("records a denial as a bounded event carrying no identity", async () => {
    const { limiter, sink } = limiterWith({ SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "1" });

    await limiter.check("auth.attempt", "owner-secret-key");
    await limiter.check("auth.attempt", "owner-secret-key");

    const events = sink.eventsNamed("rate.limit.evaluated");
    expect(events).toHaveLength(1);
    expect(events[0]?.attributes).toEqual({ policy: "auth.attempt", decision: "denied" });

    // Acceptance criterion 7 at the event boundary.
    expect(JSON.stringify(events)).not.toContain("owner-secret-key");
  });
});

/** Acceptance criterion 9. */
describe("configuration", () => {
  it("uses conservative defaults when unset", () => {
    const policies = resolveAllPolicies({});

    expect(policies["auth.attempt"].limit).toBe(RATE_LIMIT_POLICIES["auth.attempt"].limit);
    expect(policies["auth.attempt"].enabled).toBe(true);
  });

  it.each([
    ["not a number", "abc"],
    ["zero", "0"],
    ["negative", "-5"],
    ["fractional", "2.5"],
    ["absurd", "99999999"],
  ])("fails closed on a %s limit rather than defaulting", (_label, value) => {
    expect(() => resolvePolicy("auth.attempt", { SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: value })).toThrow(
      RateLimitConfigurationError,
    );
  });

  it("never echoes the offending configuration value in the error", () => {
    try {
      resolvePolicy("auth.attempt", { SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "super-secret-typo" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).not.toContain("super-secret-typo");
    }
  });

  it("supports disabling one policy and disabling globally", async () => {
    const perPolicy = resolvePolicy("auth.attempt", {
      SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS_DISABLED: "true",
    });
    expect(perPolicy.enabled).toBe(false);

    const globally = resolvePolicy("auth.attempt", { SARTORIA_RATE_LIMIT_DISABLED: "true" });
    expect(globally.enabled).toBe(false);

    const { limiter } = limiterWith({
      SARTORIA_RATE_LIMIT_DISABLED: "true",
      SARTORIA_RATE_LIMIT_AUTH_ATTEMPTS: "1",
    });

    await limiter.check("auth.attempt", "key-a");
    expect((await limiter.check("auth.attempt", "key-a")).allowed).toBe(true);
  });

  it("recognises exactly the declared policies", () => {
    for (const name of Object.keys(RATE_LIMIT_POLICIES)) {
      expect(isRateLimitPolicyName(name)).toBe(true);
    }

    expect(isRateLimitPolicyName("wardrobe.browse")).toBe(false);
    expect(isRateLimitPolicyName("__proto__")).toBe(false);
  });
});

/** Acceptance criteria 7 and 8. */
describe("identity derivation", () => {
  it("never returns anything resembling the input", () => {
    resetRateLimitSaltForTesting();

    const key = ownerKey("owner@example.test", "profile.export");

    expect(key).not.toContain("owner");
    expect(key).not.toContain("example");
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it("separates owners and reuses a key for the same owner", () => {
    expect(ownerKey("owner-1", "profile.export")).toBe(ownerKey("owner-1", "profile.export"));
    expect(ownerKey("owner-1", "profile.export")).not.toBe(ownerKey("owner-2", "profile.export"));
  });

  it("separates the same identity across policies", () => {
    expect(ownerKey("owner-1", "profile.export")).not.toBe(
      ownerKey("owner-1", "media.upload.initiate"),
    );
  });

  it("ignores a forwarding header when no proxy is trusted", () => {
    const withoutHeader = clientKey(
      { socketAddress: "203.0.113.10", trustProxy: false },
      "auth.attempt",
    );
    const withSpoofedHeader = clientKey(
      { forwardedFor: "198.51.100.7", socketAddress: "203.0.113.10", trustProxy: false },
      "auth.attempt",
    );

    // A caller cannot mint a new identity by varying the header.
    expect(withSpoofedHeader).toBe(withoutHeader);
  });

  it("honours a forwarding header when a proxy is trusted", () => {
    const first = clientKey(
      { forwardedFor: "198.51.100.7", socketAddress: "10.0.0.1", trustProxy: true },
      "auth.attempt",
    );
    const second = clientKey(
      { forwardedFor: "198.51.100.8", socketAddress: "10.0.0.1", trustProxy: true },
      "auth.attempt",
    );

    expect(first).not.toBe(second);
  });

  it("takes the left-most forwarded address", () => {
    const chained = clientKey(
      { forwardedFor: "198.51.100.7, 10.0.0.5, 10.0.0.6", trustProxy: true },
      "auth.attempt",
    );
    const direct = clientKey({ forwardedFor: "198.51.100.7", trustProxy: true }, "auth.attempt");

    expect(chained).toBe(direct);
  });

  it("returns no key when callers cannot be told apart", () => {
    // A shared bucket would let one caller exhaust the authentication limit and
    // lock out everyone, which is worse than no limit at all.
    expect(clientKey({}, "auth.attempt")).toBeUndefined();
    expect(clientKey({ socketAddress: "" }, "auth.attempt")).toBeUndefined();
    expect(
      clientKey({ forwardedFor: "198.51.100.7", trustProxy: false }, "auth.attempt"),
    ).toBeUndefined();
  });
});

/** Acceptance criterion 10. */
describe("in-memory store bounds", () => {
  it("evicts expired entries", async () => {
    const time = clock();
    const store = new InMemoryRateLimitStore();

    for (let index = 0; index < 20; index += 1) {
      await store.increment(`key-${index}`, 10, time.now());
    }
    expect(store.trackedKeyCount).toBe(20);

    time.advanceSeconds(11);
    await store.increment("trigger-sweep", 10, time.now());

    expect(store.trackedKeyCount).toBe(1);
  });

  it("enforces a maximum tracked key count", async () => {
    const time = clock();
    const store = new InMemoryRateLimitStore({ maxTrackedKeys: 50 });

    for (let index = 0; index < 200; index += 1) {
      await store.increment(`key-${index}`, 600, time.now());
    }

    expect(store.trackedKeyCount).toBeLessThanOrEqual(50);
  });
});
