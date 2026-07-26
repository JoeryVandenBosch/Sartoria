import { randomBytes } from "node:crypto";

/**
 * Correlation identifiers are always generated on the server. They are random,
 * fixed-length, and non-semantic, so they carry no account, request, or
 * wardrobe meaning and cannot be reversed into user data.
 *
 * An identifier supplied by an untrusted client is never trusted: callers pass
 * candidates through {@link resolveCorrelationId}, which replaces anything that
 * is not already an exact server-shaped identifier with a fresh one.
 */

const CORRELATION_ID_BYTES = 16;

export const CORRELATION_ID_LENGTH = CORRELATION_ID_BYTES * 2;

const CORRELATION_ID_PATTERN = new RegExp(`^[0-9a-f]{${CORRELATION_ID_LENGTH}}$`);

export function generateCorrelationId(): string {
  return randomBytes(CORRELATION_ID_BYTES).toString("hex");
}

export function isCorrelationId(value: unknown): value is string {
  return typeof value === "string" && CORRELATION_ID_PATTERN.test(value);
}

/**
 * Returns the candidate only when it is already exactly a server-shaped
 * identifier. Every other input, including a well-formed identifier of the
 * wrong length or any client-supplied text, yields a fresh identifier.
 */
export function resolveCorrelationId(candidate?: unknown): string {
  return isCorrelationId(candidate) ? candidate : generateCorrelationId();
}
