import type { RateLimitStore } from "@/lib/rate-limiting/rate-limit-policy";

/**
 * Fixed-window counter held in process memory.
 *
 * IMPORTANT: correct for a single application instance only. Behind a load
 * balancer each instance counts independently, so the effective limit is
 * multiplied by the instance count. This is acceptable for a single-instance
 * closed beta and is strictly better than no limit, but a shared store must be
 * approved through an ADR before horizontal scaling.
 *
 * Memory is bounded two ways: expired entries are swept, and a maximum tracked
 * key count is enforced. On saturation the oldest-expiring entries are dropped,
 * which briefly under-counts rather than growing without limit.
 */
export const DEFAULT_MAX_TRACKED_KEYS = 50_000;

interface Entry {
  count: number;
  /** Epoch milliseconds at which the window ends. */
  expiresAt: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  readonly #entries = new Map<string, Entry>();
  readonly #maxTrackedKeys: number;
  readonly #failOnIncrement: boolean;

  constructor(
    options: Readonly<{ maxTrackedKeys?: number; failOnIncrement?: boolean }> = {},
  ) {
    this.#maxTrackedKeys = options.maxTrackedKeys ?? DEFAULT_MAX_TRACKED_KEYS;
    this.#failOnIncrement = options.failOnIncrement ?? false;
  }

  async increment(
    key: string,
    windowSeconds: number,
    now: Date,
  ): Promise<{ count: number; resetSeconds: number }> {
    if (this.#failOnIncrement) {
      // Used to prove the limiter fails open rather than blocking traffic.
      throw new Error("rate limit store unavailable");
    }

    const currentTime = now.getTime();
    const existing = this.#entries.get(key);

    if (existing && existing.expiresAt > currentTime) {
      existing.count += 1;

      return {
        count: existing.count,
        resetSeconds: Math.max(1, Math.ceil((existing.expiresAt - currentTime) / 1_000)),
      };
    }

    // Sweep opportunistically rather than on a timer, so the store holds no
    // handles and cannot keep a process alive.
    this.#sweep(currentTime);

    const entry: Entry = { count: 1, expiresAt: currentTime + windowSeconds * 1_000 };
    this.#entries.set(key, entry);

    return { count: 1, resetSeconds: windowSeconds };
  }

  #sweep(currentTime: number): void {
    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= currentTime) {
        this.#entries.delete(key);
      }
    }

    if (this.#entries.size < this.#maxTrackedKeys) {
      return;
    }

    // Saturation: drop the entries expiring soonest. Under-counting for a
    // moment is preferable to unbounded growth.
    const ordered = [...this.#entries.entries()].sort(
      (left, right) => left[1].expiresAt - right[1].expiresAt,
    );

    for (const [key] of ordered.slice(0, Math.ceil(this.#maxTrackedKeys / 10))) {
      this.#entries.delete(key);
    }
  }

  get trackedKeyCount(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }
}
