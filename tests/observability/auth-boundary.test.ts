import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryOperationalEventSink } from "@/lib/observability/adapters/in-memory-operational-event-sink";
import { createOperationalEventEmitter } from "@/lib/observability/operational-event-emitter";

/**
 * Auth boundary coverage, added for review finding L1.
 *
 * `getCurrentUserId` runs on every page load and had no boundary test at all,
 * including no containment test — despite being the boundary the security
 * review most needed reassurance about.
 *
 * The module resolves the process-wide emitter, so the runtime module is mocked
 * to hand back one bound to an inspectable sink.
 */

let sink = new InMemoryOperationalEventSink();
let emitter = createOperationalEventEmitter({ sink, environment: "test" });

vi.mock("@/lib/observability/operational-event-runtime", () => ({
  getOperationalEventEmitter: () => emitter,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: () => {
    // Mirrors the real implementation, which signals by throwing.
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: async () => null } },
  assertProductionAuthenticationConfigured: () => undefined,
  assertAuthenticationRuntimeConfigured: () => undefined,
}));

const { getCurrentUserId } = await import("@/lib/auth/current-user");

const ORIGINAL_AUTH_MODE = process.env.SARTORIA_AUTH_MODE;

function useSink(failing = false): InMemoryOperationalEventSink {
  sink = new InMemoryOperationalEventSink(failing ? { failOnRecord: true } : {});
  emitter = createOperationalEventEmitter({
    sink,
    environment: "test",
    // Silenced so a deliberate sink failure does not write to the test output.
    onSinkFailure: () => undefined,
  });

  return sink;
}

beforeEach(() => {
  useSink();
});

afterEach(() => {
  if (ORIGINAL_AUTH_MODE === undefined) {
    delete process.env.SARTORIA_AUTH_MODE;
  } else {
    process.env.SARTORIA_AUTH_MODE = ORIGINAL_AUTH_MODE;
  }
});

describe("auth boundary", () => {
  it("reports a resolved development identity", async () => {
    delete process.env.SARTORIA_AUTH_MODE;

    const ownerId = await getCurrentUserId();

    expect(ownerId).toBeTruthy();

    const events = sink.eventsNamed("auth.session.resolved");
    expect(events).toHaveLength(1);
    expect(events[0]?.outcome).toBe("success");
    expect(events[0]?.attributes).toMatchObject({
      identitySource: "development",
      authenticated: true,
    });
  });

  it("classifies an unsupported authentication mode without echoing its value", async () => {
    process.env.SARTORIA_AUTH_MODE = "magic-link-experiment";

    await expect(getCurrentUserId()).rejects.toThrow();

    const [event] = sink.eventsNamed("auth.session.resolved");

    expect(event?.outcome).toBe("failure");
    expect(event?.attributes).toMatchObject({ failureClassification: "configuration" });

    // The configured value reaches the thrown error but must never reach a sink.
    expect(JSON.stringify(sink.events)).not.toContain("magic-link-experiment");
  });

  it("emits before redirect throws for an unauthenticated session", async () => {
    process.env.SARTORIA_AUTH_MODE = "better-auth";

    await expect(getCurrentUserId()).rejects.toThrow("NEXT_REDIRECT");

    // The event survives even though the call did not return, which is the
    // ordering the code comment claims and the only way this event ever exists.
    const [event] = sink.eventsNamed("auth.session.resolved");

    expect(event?.outcome).toBe("failure");
    expect(event?.attributes).toMatchObject({
      identitySource: "better-auth",
      authenticated: false,
      failureClassification: "not-authorised",
    });
  });

  it("carries a server-shaped correlation identifier on every event", async () => {
    delete process.env.SARTORIA_AUTH_MODE;

    await getCurrentUserId();

    for (const event of sink.events) {
      expect(event.correlationId).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  /**
   * The test the security review needed: a telemetry fault cannot break page
   * rendering. This boundary runs on every page load, so a throwing sink here
   * would take down the whole application.
   */
  it("still resolves the identity when the sink throws", async () => {
    delete process.env.SARTORIA_AUTH_MODE;
    const failing = useSink(true);

    const ownerId = await getCurrentUserId();

    expect(ownerId).toBeTruthy();
    expect(failing.events).toHaveLength(0);
  });

  it("emits no account identity, and no attribute value outside the catalogue", async () => {
    delete process.env.SARTORIA_AUTH_MODE;

    const ownerId = await getCurrentUserId();
    const [event] = sink.events;

    // The resolved identifier is the thing most likely to be emitted by
    // accident, since it is in scope at every emit point on this path.
    expect(JSON.stringify(event)).not.toContain(ownerId);

    // Asserting the exact attribute set is stronger than scanning for
    // forbidden substrings: a substring scan cannot distinguish a leaked value
    // from a legitimate event name, and would pass for any new key added later.
    expect(event?.attributes).toEqual({
      identitySource: "development",
      authenticated: true,
    });
  });
});
