/**
 * Guards against asynchronous stream failures on the process output streams.
 *
 * A write to `process.stdout` or `process.stderr` does not report a broken pipe
 * by throwing. When the reader detaches — a container log collector restarting,
 * or output piped into a process that exits early — the failure arrives later as
 * an `error` event on the stream. An `error` event with no listener is raised by
 * Node as an uncaught exception, which means it escapes the emitter's
 * `try`/`catch` entirely.
 *
 * That is the one failure mode of the console sink that layered containment
 * inside `emit` cannot reach, so it is handled here instead: a single idempotent
 * listener per stream, installed on first use, that discards the error.
 *
 * Discarding is deliberate. There is nowhere left to report a broken log pipe
 * to, and the emitter contract — telemetry can never interrupt a user workflow —
 * outranks the lost diagnostic.
 */

let stdoutGuarded = false;
let stderrGuarded = false;

export function guardProcessStdout(): void {
  if (stdoutGuarded) {
    return;
  }

  stdoutGuarded = true;
  process.stdout.on("error", () => {
    // Intentionally empty. See the module comment.
  });
}

export function guardProcessStderr(): void {
  if (stderrGuarded) {
    return;
  }

  stderrGuarded = true;
  process.stderr.on("error", () => {
    // Intentionally empty. See the module comment.
  });
}

/** Resets the installed-guard flags. Intended for tests only. */
export function resetProcessStreamGuardsForTesting(): void {
  stdoutGuarded = false;
  stderrGuarded = false;
}
