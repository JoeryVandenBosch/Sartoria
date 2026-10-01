import { randomBytes } from "node:crypto";

/**
 * Correlation identifiers are always generated on the server. They are random,
 * fixed-length, and non-semantic, so they carry no account, request, or
 * wardrobe meaning and cannot be reversed into user data.
 *
 * No boundary accepts a client-supplied identifier. If one ever does, it must
 * validate the candidate with {@link isCorrelationId} and generate a fresh
 * identifier on any mismatch, rather than trusting the input.
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
