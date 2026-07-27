import {
  buildOperationalEvent,
  type BuildOperationalEventContext,
} from "@/lib/observability/build-operational-event";
import {
  resolveDeploymentEnvironment,
  resolveRelease,
  type OperationalEventSink,
} from "@/lib/observability/operational-event-sink";
import type {
  DeploymentEnvironment,
  OperationalEventInput,
  OperationalEventName,
} from "@/lib/observability/operational-event";

/**
 * The application-facing observability interface.
 *
 * This is the only observability type an application use case may depend on.
 * It is deliberately tiny: one method, no transport concepts, no provider
 * types, and no return value a caller could be tempted to branch on.
 *
 * `emit` never throws and never returns a promise, so a caller cannot
 * accidentally await telemetry or couple user-visible behaviour to it.
 */
export interface OperationalEventEmitter {
  emit<N extends OperationalEventName>(input: OperationalEventInput<N>): void;
}

/**
 * A local, dependency-free failure signal used when a sink itself fails.
 *
 * It must never emit an operational event, or a failing sink would recurse.
 * The default writes a single bounded line to stderr and nothing else.
 */
export type SinkFailureSignal = (classification: "dependency-unavailable" | "unexpected") => void;

const DEFAULT_SINK_FAILURE_SIGNAL: SinkFailureSignal = (classification) => {
  // Deliberately not an operational event, and deliberately not the sink.
  // Bounded, constant text: no event, no error object, no stack.
  process.stderr.write(`sartoria observability sink failed: ${classification}\n`);
};

export interface CreateOperationalEventEmitterOptions {
  readonly sink: OperationalEventSink;
  readonly environment?: DeploymentEnvironment;
  readonly release?: string;
  readonly now?: () => Date;
  readonly onSinkFailure?: SinkFailureSignal;
}

/**
 * Creates an emitter bound to a sink.
 *
 * Failure containment is total and layered:
 *
 * - an invalid event is dropped during construction and never reaches a sink;
 * - a sink that throws synchronously is caught;
 * - a sink that rejects asynchronously is caught through the returned promise,
 *   so no unhandled rejection can crash a Node process;
 * - every failure path ends at the local failure signal, which cannot recurse.
 *
 * The caller therefore cannot be interrupted by telemetry under any condition,
 * which is what keeps acceptance criterion 5 true by construction.
 */
export function createOperationalEventEmitter(
  options: CreateOperationalEventEmitterOptions,
): OperationalEventEmitter {
  const environment = options.environment ?? resolveDeploymentEnvironment();
  const release = options.release ?? resolveRelease();
  const now = options.now ?? (() => new Date());
  const onSinkFailure = options.onSinkFailure ?? DEFAULT_SINK_FAILURE_SIGNAL;

  const signalFailure = (classification: "dependency-unavailable" | "unexpected"): void => {
    try {
      onSinkFailure(classification);
    } catch {
      // A failing failure signal is the end of the line. Swallow it: there is
      // nowhere left to report to, and the user workflow must still proceed.
    }
  };

  return {
    emit(input): void {
      try {
        const context: BuildOperationalEventContext = {
          environment,
          timestamp: now(),
          ...(release === undefined ? {} : { release }),
        };

        const built = buildOperationalEvent(input, context);

        if (!built.ok) {
          // A rejected event is a programming error, not an operational one.
          // It is dropped rather than emitted in a degraded form, because a
          // partially-validated envelope is exactly what privacy review cannot
          // reason about.
          signalFailure("unexpected");
          return;
        }

        const result = options.sink.record(built.event);

        if (isPromiseLike(result)) {
          // Attach handlers without awaiting: the caller must not be delayed,
          // and an unobserved rejection must not reach the process handler.
          void Promise.resolve(result).then(undefined, () => {
            signalFailure("dependency-unavailable");
          });
        }
      } catch {
        signalFailure("unexpected");
      }
    },
  };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * An emitter that does nothing.
 *
 * Used as the default wherever instrumentation is optional, so a caller never
 * needs a null check and a boundary is never coupled to emitter availability.
 */
export const NULL_OPERATIONAL_EVENT_EMITTER: OperationalEventEmitter = {
  emit(): void {
    // Intentionally empty.
  },
};
