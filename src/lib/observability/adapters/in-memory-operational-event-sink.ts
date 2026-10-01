import type { OperationalEventSink } from "@/lib/observability/operational-event-sink";
import type { OperationalEvent } from "@/lib/observability/operational-event";

/**
 * Deterministic sink for tests and local inspection.
 *
 * Events are retained in emission order and returned as frozen copies, so a
 * test cannot mutate recorded history and a later assertion cannot be affected
 * by an earlier one.
 */
export class InMemoryOperationalEventSink implements OperationalEventSink {
  readonly #events: OperationalEvent[] = [];
  readonly #failOnRecord: boolean;

  constructor(options: Readonly<{ failOnRecord?: boolean }> = {}) {
    this.#failOnRecord = options.failOnRecord ?? false;
  }

  record(event: OperationalEvent): void {
    if (this.#failOnRecord) {
      // Used to prove that a failing sink cannot break a user workflow.
      throw new Error("in-memory sink configured to fail");
    }

    this.#events.push(event);
  }

  get events(): readonly OperationalEvent[] {
    return Object.freeze([...this.#events]);
  }

  eventsNamed(name: OperationalEvent["name"]): readonly OperationalEvent[] {
    return this.events.filter((event) => event.name === name);
  }

  clear(): void {
    this.#events.length = 0;
  }
}

/**
 * Asynchronous variant that always rejects, proving the emitter contains an
 * async sink failure without producing an unhandled rejection.
 */
export class RejectingOperationalEventSink implements OperationalEventSink {
  record(): Promise<void> {
    return Promise.reject(new Error("sink unavailable"));
  }
}
