import { describe, expect, it } from "vitest";

import {
  buildOperationalEvent,
  serialiseOperationalEvent,
  isReleaseIdentifier,
} from "@/lib/observability/build-operational-event";
import {
  OPERATIONAL_EVENT_CATALOGUE,
  OPERATIONAL_EVENT_SCHEMA_VERSION,
  MAX_NUMERIC_ATTRIBUTE,
  isOperationalEventName,
  validateAttributes,
} from "@/lib/observability/operational-event";

const FIXED_TIME = new Date("2026-01-01T00:00:00.000Z");
const CONTEXT = {
  environment: "test",
  release: "1.2.3",
  timestamp: FIXED_TIME,
} as const;

describe("operational event envelope", () => {
  it("includes every required envelope field", () => {
    const result = buildOperationalEvent(
      {
        name: "database.readiness.checked",
        severity: "info",
        outcome: "success",
        correlationId: "a".repeat(32),
        durationMs: 12,
      },
      CONTEXT,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.event).toMatchObject({
      schemaVersion: OPERATIONAL_EVENT_SCHEMA_VERSION,
      name: "database.readiness.checked",
      severity: "info",
      timestamp: "2026-01-01T00:00:00.000Z",
      environment: "test",
      outcome: "success",
      release: "1.2.3",
      durationMs: 12,
    });
  });

  it("omits optional fields entirely rather than serialising null", () => {
    const result = buildOperationalEvent(
      { name: "database.readiness.checked", severity: "info", outcome: "success" },
      { environment: "test", timestamp: FIXED_TIME },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialised = serialiseOperationalEvent(result.event);

    expect(serialised).not.toContain("null");
    expect(serialised).not.toContain("release");
    expect(serialised).not.toContain("correlationId");
    expect(serialised).not.toContain("durationMs");
  });

  /** Acceptance criterion 1. */
  it("serialises deterministically for the same input, time, and correlation id", () => {
    const build = () =>
      buildOperationalEvent(
        {
          name: "recommendation.generation.completed",
          severity: "info",
          outcome: "degraded",
          correlationId: "b".repeat(32),
          durationMs: 40,
          attributes: { fellBackToDeterministic: true, generationSource: "fallback" },
        },
        CONTEXT,
      );

    const first = build();
    const second = build();

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(serialiseOperationalEvent(first.event)).toBe(serialiseOperationalEvent(second.event));
  });

  it("orders attribute keys by catalogue order, not insertion order", () => {
    const reversed = buildOperationalEvent(
      {
        name: "recommendation.generation.completed",
        severity: "info",
        outcome: "degraded",
        // Deliberately supplied in an order different from the catalogue.
        attributes: { fellBackToDeterministic: true, generationSource: "fallback" },
      },
      CONTEXT,
    );
    const forward = buildOperationalEvent(
      {
        name: "recommendation.generation.completed",
        severity: "info",
        outcome: "degraded",
        attributes: { generationSource: "fallback", fellBackToDeterministic: true },
      },
      CONTEXT,
    );

    expect(reversed.ok && forward.ok).toBe(true);
    if (!reversed.ok || !forward.ok) return;

    expect(serialiseOperationalEvent(reversed.event)).toBe(
      serialiseOperationalEvent(forward.event),
    );
  });

  it("produces a single line with no ANSI formatting", () => {
    const result = buildOperationalEvent(
      { name: "database.readiness.checked", severity: "error", outcome: "failure" },
      CONTEXT,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialised = serialiseOperationalEvent(result.event);

    expect(serialised).not.toContain("\n");
    expect(serialised).not.toMatch(/\u001b\[/);
    expect(() => JSON.parse(serialised)).not.toThrow();
  });
});

/** Acceptance criterion 2. */
describe("operational event rejection", () => {
  it("rejects an unknown event name", () => {
    const result = buildOperationalEvent(
      // @ts-expect-error deliberately outside the catalogue
      { name: "wardrobe.item.viewed", severity: "info", outcome: "success" },
      CONTEXT,
    );

    expect(result).toEqual({ ok: false, reason: "unknown-event-name" });
  });

  it("rejects an unknown attribute key", () => {
    const result = buildOperationalEvent(
      {
        name: "database.readiness.checked",
        severity: "info",
        outcome: "success",
        // @ts-expect-error not declared for this event
        attributes: { ownerId: "user-123" },
      },
      CONTEXT,
    );

    expect(result).toMatchObject({ ok: false, reason: "unknown-attribute-key", key: "ownerId" });
  });

  it.each([
    ["nested object", { failureClassification: { nested: true } }],
    ["array", { failureClassification: ["timeout"] }],
    ["null", { failureClassification: null }],
    ["undeclared enum value", { failureClassification: "database-exploded" }],
  ])("rejects %s attribute values", (_label, attributes) => {
    const result = validateAttributes("database.readiness.checked", attributes);

    expect(result.valid).toBe(false);
  });

  it.each([
    ["negative", -1],
    ["non-finite", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
    ["fractional", 1.5],
    ["oversized", MAX_NUMERIC_ATTRIBUTE + 1],
  ])("rejects a %s duration", (_label, durationMs) => {
    const result = buildOperationalEvent(
      { name: "database.readiness.checked", severity: "info", outcome: "success", durationMs },
      CONTEXT,
    );

    expect(result).toEqual({ ok: false, reason: "invalid-duration" });
  });

  it.each([
    ["negative", -1],
    ["oversized", MAX_NUMERIC_ATTRIBUTE + 1],
    ["fractional", 2.5],
  ])("rejects a %s count attribute", (_label, identitiesCreated) => {
    const result = validateAttributes("staging.identity.bootstrapped", { identitiesCreated });

    expect(result.valid).toBe(false);
  });

  it("rejects an unrecognised severity and outcome", () => {
    expect(
      buildOperationalEvent(
        // @ts-expect-error deliberately invalid
        { name: "database.readiness.checked", severity: "fatal", outcome: "success" },
        CONTEXT,
      ),
    ).toEqual({ ok: false, reason: "invalid-severity" });

    expect(
      buildOperationalEvent(
        // @ts-expect-error deliberately invalid
        { name: "database.readiness.checked", severity: "info", outcome: "exploded" },
        CONTEXT,
      ),
    ).toEqual({ ok: false, reason: "invalid-outcome" });
  });

  it("rejects an invalid timestamp", () => {
    const result = buildOperationalEvent(
      { name: "database.readiness.checked", severity: "info", outcome: "success" },
      { environment: "test", timestamp: new Date("not-a-date") },
    );

    expect(result).toEqual({ ok: false, reason: "invalid-timestamp" });
  });
});

/**
 * Acceptance criterion 3.
 *
 * These prove the exclusion is structural. Each forbidden value is offered to
 * the schema and refused, so no reviewer has to trust that call sites are
 * careful.
 */
describe("forbidden private data cannot be represented", () => {
  const FORBIDDEN_VALUES: ReadonlyArray<readonly [string, unknown]> = [
    ["email address", "owner@example.test"],
    ["user identifier", "usr_01HZY8Q"],
    ["media key", "quarantine/1a2b3c/photo.heic"],
    ["signed URL", "https://example.test/object?signature=abc"],
    ["file name", "linen-blazer.jpg"],
    ["prompt text", "Suggest an outfit for a wedding in Milan"],
    ["measurement", "chest 102cm"],
    ["travel destination", "Milan"],
    ["password", "correct-horse-battery-staple"],
    ["bearer token", "Bearer eyJhbGciOi"],
    ["raw exception", "TypeError: cannot read property id of undefined"],
    ["stack trace", "at processWardrobeMedia (/app/src/media.ts:42:11)"],
  ];

  it.each(FORBIDDEN_VALUES)("refuses %s in a declared enum attribute", (_label, value) => {
    const result = validateAttributes("media.processing.completed", { scanVerdict: value });

    expect(result.valid).toBe(false);
  });

  it.each(FORBIDDEN_VALUES)("refuses %s under an undeclared key", (_label, value) => {
    const result = validateAttributes("media.processing.completed", { ownerEmail: value });

    expect(result).toMatchObject({ valid: false, failure: "unknown-attribute-key" });
  });

  it("never lets a forbidden value reach serialised output", () => {
    const result = buildOperationalEvent(
      {
        name: "media.processing.completed",
        severity: "info",
        outcome: "success",
        attributes: {
          disposition: "ready",
          scanVerdict: "safe",
          // @ts-expect-error deliberately forbidden
          quarantineKey: "quarantine/secret.jpg",
        },
      },
      CONTEXT,
    );

    // Rejected outright rather than silently stripped, so the mistake surfaces.
    expect(result).toMatchObject({ ok: false, reason: "unknown-attribute-key" });
  });

  it("declares no free-text attribute anywhere in the catalogue", () => {
    for (const [name, definition] of Object.entries(OPERATIONAL_EVENT_CATALOGUE)) {
      for (const [key, specification] of Object.entries(definition.attributes)) {
        expect(
          ["boolean", "count", "enum"],
          `${name}.${key} must not accept free text`,
        ).toContain(specification.kind);
      }
    }
  });

  it("rejects a release identifier containing arbitrary text", () => {
    expect(isReleaseIdentifier("1.2.3")).toBe(true);
    expect(isReleaseIdentifier("a1b2c3d")).toBe(true);
    expect(isReleaseIdentifier("owner@example.test")).toBe(false);
    expect(isReleaseIdentifier("release for milan trip")).toBe(false);
    expect(isReleaseIdentifier("x".repeat(65))).toBe(false);
  });
});

describe("event name allow-list", () => {
  it("recognises exactly the catalogue names", () => {
    for (const name of Object.keys(OPERATIONAL_EVENT_CATALOGUE)) {
      expect(isOperationalEventName(name)).toBe(true);
    }

    expect(isOperationalEventName("wardrobe.item.created")).toBe(false);
    expect(isOperationalEventName("toString")).toBe(false);
    expect(isOperationalEventName("__proto__")).toBe(false);
  });
});

/**
 * Regression cover for the review finding on PR #23: validation inspected own
 * enumerable properties while the envelope builder read through the prototype
 * chain, so an undeclared value could pass validation and still be serialised.
 */
describe("attribute prototype safety", () => {
  it("drops a catalogue attribute carried on the prototype rather than emitting it", () => {
    const attributes = Object.create({
      identitySource: "owner@example.test",
      failureClassification: "postgres://sartoria:secret@db.internal/sartoria",
    }) as Record<string, unknown>;
    attributes.authenticated = true;

    const result = buildOperationalEvent(
      {
        name: "auth.session.resolved",
        severity: "info",
        outcome: "success",
        attributes: attributes as never,
      },
      CONTEXT,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialised = serialiseOperationalEvent(result.event);

    expect(serialised).not.toContain("owner@example.test");
    expect(serialised).not.toContain("secret");
    expect(serialised).not.toContain("identitySource");
    expect(serialised).toContain('"authenticated":true');
  });

  it("is unaffected by Object.prototype pollution", () => {
    const polluted = Object.prototype as unknown as Record<string, unknown>;
    polluted.failureClassification = "polluted-free-text";

    try {
      const result = buildOperationalEvent(
        {
          name: "auth.session.resolved",
          severity: "info",
          outcome: "success",
          attributes: { identitySource: "development", authenticated: true },
        },
        CONTEXT,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(serialiseOperationalEvent(result.event)).not.toContain("polluted-free-text");
    } finally {
      delete polluted.failureClassification;
    }
  });

  it("classifies an inherited Object.prototype key as an unknown attribute key", () => {
    expect(
      validateAttributes("database.readiness.checked", { constructor: "anything" }),
    ).toMatchObject({ valid: false, failure: "unknown-attribute-key", key: "constructor" });

    expect(
      validateAttributes("database.readiness.checked", { toString: "anything" }),
    ).toMatchObject({ valid: false, failure: "unknown-attribute-key", key: "toString" });
  });
});
