import type { OperationalEventSink } from "@/lib/observability/operational-event-sink";

/**
 * Sink that discards every event.
 *
 * This is the documented rollback path: selecting it disables emission
 * entirely without removing instrumentation or changing domain behaviour.
 */
export class NoOpOperationalEventSink implements OperationalEventSink {
  record(): void {
    // Intentionally empty.
  }
}
