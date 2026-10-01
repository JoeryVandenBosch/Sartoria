import { serialiseOperationalEvent } from "@/lib/observability/build-operational-event";
import { guardProcessStdout } from "@/lib/observability/process-stream-guard";
import type { OperationalEventSink } from "@/lib/observability/operational-event-sink";
import type { OperationalEvent } from "@/lib/observability/operational-event";

/**
 * Structured console sink suitable for container log collection.
 *
 * Output is exactly one JSON object per line with no ANSI formatting, no
 * pretty-printing, and no exception serialisation. It writes directly to the
 * stream rather than through `console`, so no runtime can inject colour codes
 * or object inspection.
 */
export class ConsoleOperationalEventSink implements OperationalEventSink {
  readonly #write: (line: string) => void;

  constructor(
    options: Readonly<{ write?: (line: string) => void }> = {},
  ) {
    if (options.write === undefined) {
      // A broken stdout pipe surfaces as an asynchronous stream error, which no
      // caller-side try/catch can contain. Guard the stream before the first
      // write rather than after the first failure.
      guardProcessStdout();
    }

    this.#write =
      options.write ??
      ((line: string): void => {
        process.stdout.write(line);
      });
  }

  record(event: OperationalEvent): void {
    this.#write(`${serialiseOperationalEvent(event)}\n`);
  }
}
