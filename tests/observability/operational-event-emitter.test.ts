import { describe, expect, it, vi } from "vitest";

import { ConsoleOperationalEventSink } from "@/lib/observability/adapters/console-operational-event-sink";
import {
  InMemoryOperationalEventSink,
  RejectingOperationalEventSink,
} from "@/lib/observability/adapters/in-memory-operational-event-sink";
import { NoOpOperationalEventSink } from "@/lib/observability/adapters/no-op-operational-event-sink";
import {
  createOperationalEventEmitter,
  NULL_OPERATIONAL_EVENT_EMITTER,
} from "@/lib/observability/operational-event-emitter";
import {
  createOperationalEventSink,
  isOperationalEventSinkKind,
  resolveOperationalEventSinkKind,
} from "@/lib/observability/operational-event-runtime";
import {
  resolveDeploymentEnvironment,
  resolveRelease,
} from "@/lib/observability/operational-event-sink";

const FIXED_TIME = new Date("2026-01-01T00:00:00.000Z");

const VALID_EVENT = {
  name: "database.readiness.checked",
  severity: "info",
  outcome: "success",
} as const;

describe("emitter", () => {
  it("records a valid event through the sink", () => {
    const sink = new InMemoryOperationalEventSink();
    const emitter = createOperationalEventEmitter({
      sink,
      environment: "test",
      now: () => FIXED_TIME,
    });

    emitter.emit(VALID_EVENT);

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({ name: "database.readiness.checked" });
  });

  it("returns void so a caller cannot await telemetry", () => {
    const emitter = createOperationalEventEmitter({
      sink: new InMemoryOperationalEventSink(),
      environment: "test",
    });

    expect(emitter.emit(VALID_EVENT)).toBeUndefined();
  });

  /** Acceptance criterion 5. */
  it("does not throw when the sink throws synchronously", () => {
    const onSinkFailure = vi.fn();
    const emitter = createOperationalEventEmitter({
      sink: new InMemoryOperationalEventSink({ failOnRecord: true }),
      environment: "test",
      onSinkFailure,
    });

    expect(() => emitter.emit(VALID_EVENT)).not.toThrow();
    expect(onSinkFailure).toHaveBeenCalledWith("unexpected");
  });

  it("contains an asynchronous sink rejection without an unhandled rejection", async () => {
    const onSinkFailure = vi.fn();
    const emitter = createOperationalEventEmitter({
      sink: new RejectingOperationalEventSink(),
      environment: "test",
      onSinkFailure,
    });

    expect(() => emitter.emit(VALID_EVENT)).not.toThrow();

    // Allow the rejection handler to run.
    await new Promise((resolve) => setImmediate(resolve));

    expect(onSinkFailure).toHaveBeenCalledWith("dependency-unavailable");
  });

  it("drops an invalid event without reaching the sink", () => {
    const sink = new InMemoryOperationalEventSink();
    const onSinkFailure = vi.fn();
    const emitter = createOperationalEventEmitter({
      sink,
      environment: "test",
      onSinkFailure,
    });

    // @ts-expect-error deliberately outside the catalogue
    emitter.emit({ name: "wardrobe.item.viewed", severity: "info", outcome: "success" });

    expect(sink.events).toHaveLength(0);
    expect(onSinkFailure).toHaveBeenCalledWith("unexpected");
  });

  it("never emits an observability event in response to a sink failure", () => {
    const recorded: string[] = [];
    const emitter = createOperationalEventEmitter({
      sink: {
        record() {
          recorded.push("record");
          throw new Error("sink down");
        },
      },
      environment: "test",
    });

    // A recursive implementation would re-enter record() here.
    emitter.emit(VALID_EVENT);

    expect(recorded).toHaveLength(1);
  });

  it("survives a failure signal that itself throws", () => {
    const emitter = createOperationalEventEmitter({
      sink: new InMemoryOperationalEventSink({ failOnRecord: true }),
      environment: "test",
      onSinkFailure: () => {
        throw new Error("stderr unavailable");
      },
    });

    expect(() => emitter.emit(VALID_EVENT)).not.toThrow();
  });

  it("provides a null emitter that does nothing", () => {
    expect(() => NULL_OPERATIONAL_EVENT_EMITTER.emit(VALID_EVENT)).not.toThrow();
  });
});

/** Acceptance criterion 7. */
describe("console sink", () => {
  it("writes exactly one JSON line per event with no ANSI formatting", () => {
    const lines: string[] = [];
    const sink = new ConsoleOperationalEventSink({ write: (line) => lines.push(line) });
    const emitter = createOperationalEventEmitter({
      sink,
      environment: "test",
      release: "1.0.0",
      now: () => FIXED_TIME,
    });

    emitter.emit(VALID_EVENT);
    emitter.emit({ ...VALID_EVENT, severity: "error", outcome: "failure" });

    expect(lines).toHaveLength(2);

    for (const line of lines) {
      expect(line.endsWith("\n")).toBe(true);
      expect(line.trimEnd()).not.toContain("\n");
      expect(line).not.toMatch(/\u001b\[/);
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("does not serialise an exception object even when a sink is given one", () => {
    const lines: string[] = [];
    const sink = new ConsoleOperationalEventSink({ write: (line) => lines.push(line) });
    const emitter = createOperationalEventEmitter({
      sink,
      environment: "test",
      now: () => FIXED_TIME,
    });

    emitter.emit({
      name: "database.readiness.checked",
      severity: "error",
      outcome: "failure",
      attributes: { failureClassification: "dependency-unavailable" },
    });

    const [firstLine] = lines;
    expect(firstLine).toBeDefined();
    const parsed = JSON.parse(firstLine ?? "{}") as Record<string, unknown>;

    expect(JSON.stringify(parsed)).not.toContain("stack");
    expect(parsed.attributes).toEqual({ failureClassification: "dependency-unavailable" });
  });
});

describe("no-op sink", () => {
  it("discards events, providing the documented rollback path", () => {
    const emitter = createOperationalEventEmitter({
      sink: new NoOpOperationalEventSink(),
      environment: "production",
    });

    expect(() => emitter.emit(VALID_EVENT)).not.toThrow();
  });
});

/** Acceptance criterion 6. */
describe("sink selection", () => {
  it("accepts only console and none", () => {
    expect(isOperationalEventSinkKind("console")).toBe(true);
    expect(isOperationalEventSinkKind("none")).toBe(true);
    expect(isOperationalEventSinkKind("http")).toBe(false);
    expect(isOperationalEventSinkKind("otlp")).toBe(false);
    expect(isOperationalEventSinkKind("datadog")).toBe(false);
  });

  it("falls back to console in production when configuration is unrecognised", () => {
    expect(resolveOperationalEventSinkKind("otlp", "production")).toBe("console");
    expect(resolveOperationalEventSinkKind(undefined, "production")).toBe("console");
  });

  it("defaults to none under test so output stays deterministic", () => {
    expect(resolveOperationalEventSinkKind(undefined, "test")).toBe("none");
  });

  it("never constructs a network-capable sink", () => {
    expect(createOperationalEventSink("console")).toBeInstanceOf(ConsoleOperationalEventSink);
    expect(createOperationalEventSink("none")).toBeInstanceOf(NoOpOperationalEventSink);
  });
});

describe("deployment context", () => {
  it("maps recognised environments and rejects arbitrary text", () => {
    expect(resolveDeploymentEnvironment("staging", undefined)).toBe("staging");
    expect(resolveDeploymentEnvironment("PRODUCTION", undefined)).toBe("production");
    expect(resolveDeploymentEnvironment("milan-datacentre", undefined)).toBe("unknown");
  });

  it("falls back to NODE_ENV when no environment is configured", () => {
    expect(resolveDeploymentEnvironment(undefined, "production")).toBe("production");
    expect(resolveDeploymentEnvironment("", "production")).toBe("production");
  });

  it("reports unknown when neither configuration nor NODE_ENV is recognised", () => {
    // Passing an explicit empty string avoids JavaScript default-parameter
    // substitution, which would otherwise re-read the ambient NODE_ENV.
    expect(resolveDeploymentEnvironment("", "")).toBe("unknown");
    expect(resolveDeploymentEnvironment("", "qa")).toBe("unknown");
  });

  it("drops a release identifier that is not conservatively shaped", () => {
    expect(resolveRelease("1.4.2")).toBe("1.4.2");
    expect(resolveRelease("owner@example.test")).toBeUndefined();
    expect(resolveRelease(undefined)).toBeUndefined();
  });
});
