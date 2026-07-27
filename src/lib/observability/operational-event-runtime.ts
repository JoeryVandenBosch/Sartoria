import { ConsoleOperationalEventSink } from "@/lib/observability/adapters/console-operational-event-sink";
import { NoOpOperationalEventSink } from "@/lib/observability/adapters/no-op-operational-event-sink";
import {
  createOperationalEventEmitter,
  type OperationalEventEmitter,
} from "@/lib/observability/operational-event-emitter";
import {
  resolveDeploymentEnvironment,
  type OperationalEventSink,
} from "@/lib/observability/operational-event-sink";

/**
 * Sink selection is configuration-driven and closed.
 *
 * There is deliberately no `http`, `otlp`, or vendor option. Adding an external
 * destination requires a code change and an ADR, so a misconfigured environment
 * variable can never cause telemetry to leave the deployment. This is what
 * makes "production never enables an unapproved external endpoint" a property
 * of the code rather than of an operator's discipline.
 */
export const OPERATIONAL_EVENT_SINK_KINDS = ["console", "none"] as const;

export type OperationalEventSinkKind = (typeof OPERATIONAL_EVENT_SINK_KINDS)[number];

export function isOperationalEventSinkKind(value: unknown): value is OperationalEventSinkKind {
  return (
    typeof value === "string" && (OPERATIONAL_EVENT_SINK_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Resolves the configured sink kind.
 *
 * Defaults are chosen so that the safe option is the one you get by doing
 * nothing: unset or unrecognised configuration yields `none` in test (keeping
 * test output clean and deterministic) and `console` elsewhere.
 */
export function resolveOperationalEventSinkKind(
  configuredKind: string | undefined = process.env.SARTORIA_OBSERVABILITY_SINK,
  environment = resolveDeploymentEnvironment(),
): OperationalEventSinkKind {
  const candidate = configuredKind?.trim().toLowerCase();

  if (isOperationalEventSinkKind(candidate)) {
    return candidate;
  }

  return environment === "test" ? "none" : "console";
}

export function createOperationalEventSink(
  kind: OperationalEventSinkKind = resolveOperationalEventSinkKind(),
): OperationalEventSink {
  switch (kind) {
    case "console":
      return new ConsoleOperationalEventSink();
    case "none":
      return new NoOpOperationalEventSink();
  }
}

let sharedEmitter: OperationalEventEmitter | undefined;

/**
 * Returns the process-wide emitter, created on first use.
 *
 * Transport and infrastructure entry points use this. Application use cases do
 * not: they receive an emitter through their existing dependency parameter, so
 * they stay pure and testable and never reach for global state.
 */
export function getOperationalEventEmitter(): OperationalEventEmitter {
  sharedEmitter ??= createOperationalEventEmitter({ sink: createOperationalEventSink() });

  return sharedEmitter;
}

/** Resets the shared emitter. Intended for tests only. */
export function resetOperationalEventEmitterForTesting(): void {
  sharedEmitter = undefined;
}
