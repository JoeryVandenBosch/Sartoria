import { afterEach, describe, expect, it } from "vitest";

import {
  guardProcessStderr,
  guardProcessStdout,
  resetProcessStreamGuardsForTesting,
} from "@/lib/observability/process-stream-guard";

/**
 * A broken stdout pipe does not throw. It surfaces later as an `error` event on
 * the stream, and an `error` event with no listener is raised by Node as an
 * uncaught exception — outside every try/catch the emitter installs. These
 * tests pin the listener that closes that gap.
 */
describe("process stream guards", () => {
  afterEach(() => {
    process.stdout.removeAllListeners("error");
    process.stderr.removeAllListeners("error");
    resetProcessStreamGuardsForTesting();
  });

  it("installs an error listener on stdout", () => {
    expect(process.stdout.listenerCount("error")).toBe(0);

    guardProcessStdout();

    expect(process.stdout.listenerCount("error")).toBe(1);
  });

  it("installs an error listener on stderr", () => {
    expect(process.stderr.listenerCount("error")).toBe(0);

    guardProcessStderr();

    expect(process.stderr.listenerCount("error")).toBe(1);
  });

  it("is idempotent, so repeated sink construction cannot leak listeners", () => {
    guardProcessStdout();
    guardProcessStdout();
    guardProcessStdout();

    expect(process.stdout.listenerCount("error")).toBe(1);
  });

  it("swallows a stream error instead of letting it reach the process", () => {
    guardProcessStdout();

    expect(() => process.stdout.emit("error", new Error("EPIPE"))).not.toThrow();
  });
});
