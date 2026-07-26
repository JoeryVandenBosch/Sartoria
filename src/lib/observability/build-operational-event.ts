/**
 * Envelope construction for operational events.
 *
 * The builder is the only sanctioned way to produce an {@link OperationalEvent}.
 * It rejects anything the catalogue does not permit, so an invalid or
 * privacy-violating event is never handed to a sink.
 *
 * Serialisation is deterministic: keys are emitted in a fixed order and
 * optional keys are omitted entirely rather than serialised as `null`. Given
 * the same input, timestamp, and correlation identifier, the output bytes are
 * byte-for-byte identical.
 */

import {
  DEPLOYMENT_ENVIRONMENTS,
  OPERATIONAL_EVENT_CATALOGUE,
  OPERATIONAL_EVENT_OUTCOMES,
  OPERATIONAL_EVENT_SCHEMA_VERSION,
  OPERATIONAL_EVENT_SEVERITIES,
  isBoundedNumber,
  isOperationalEventName,
  validateAttributes,
  type DeploymentEnvironment,
  type OperationalEvent,
  type OperationalEventAttributeValue,
  type OperationalEventInput,
  type OperationalEventName,
} from "@/lib/observability/operational-event";
import { isCorrelationId } from "@/lib/observability/correlation-id";

/** Maximum accepted length of a configured release identifier. */
export const MAX_RELEASE_LENGTH = 64;

/**
 * Release identifiers are operator-configured, so they are constrained to a
 * conservative character set. Anything else is dropped rather than emitted,
 * because a release value is never important enough to risk leaking content.
 */
const RELEASE_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function isReleaseIdentifier(value: unknown): value is string {
  return typeof value === "string" && RELEASE_PATTERN.test(value);
}

export type EventRejectionReason =
  | "unknown-event-name"
  | "unknown-attribute-key"
  | "invalid-attribute-value"
  | "invalid-severity"
  | "invalid-outcome"
  | "invalid-environment"
  | "invalid-duration"
  | "invalid-timestamp";

export type BuildOperationalEventResult =
  | { readonly ok: true; readonly event: OperationalEvent }
  | { readonly ok: false; readonly reason: EventRejectionReason; readonly key?: string };

export interface BuildOperationalEventContext {
  readonly environment: DeploymentEnvironment;
  readonly release?: string;
  readonly timestamp: Date;
}

function isValidTimestamp(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * Builds a validated envelope. Returns a rejection rather than throwing, so a
 * caller at a user-facing boundary can never be interrupted by telemetry.
 */
export function buildOperationalEvent<N extends OperationalEventName>(
  input: OperationalEventInput<N>,
  context: BuildOperationalEventContext,
): BuildOperationalEventResult {
  if (!isOperationalEventName(input.name)) {
    return { ok: false, reason: "unknown-event-name" };
  }

  if (!OPERATIONAL_EVENT_SEVERITIES.includes(input.severity)) {
    return { ok: false, reason: "invalid-severity" };
  }

  if (!OPERATIONAL_EVENT_OUTCOMES.includes(input.outcome)) {
    return { ok: false, reason: "invalid-outcome" };
  }

  if (!DEPLOYMENT_ENVIRONMENTS.includes(context.environment)) {
    return { ok: false, reason: "invalid-environment" };
  }

  if (!isValidTimestamp(context.timestamp)) {
    return { ok: false, reason: "invalid-timestamp" };
  }

  if (input.durationMs !== undefined && !isBoundedNumber(input.durationMs)) {
    return { ok: false, reason: "invalid-duration" };
  }

  const attributeResult = validateAttributes(input.name, input.attributes);
  if (!attributeResult.valid) {
    return {
      ok: false,
      reason: attributeResult.failure ?? "invalid-attribute-value",
      ...(attributeResult.key === undefined ? {} : { key: attributeResult.key }),
    };
  }

  // Rebuilt key-by-key in catalogue order. Copying the caller's object wholesale
  // would risk carrying prototype or extra enumerable properties into the sink.
  const attributes = normaliseAttributes(input.name, input.attributes);

  const event: OperationalEvent = {
    schemaVersion: OPERATIONAL_EVENT_SCHEMA_VERSION,
    name: input.name,
    severity: input.severity,
    timestamp: context.timestamp.toISOString(),
    environment: context.environment,
    outcome: input.outcome,
    ...(isReleaseIdentifier(context.release) ? { release: context.release } : {}),
    ...(isCorrelationId(input.correlationId) ? { correlationId: input.correlationId } : {}),
    ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
    ...(attributes === undefined ? {} : { attributes }),
  };

  return { ok: true, event };
}

function normaliseAttributes(
  name: OperationalEventName,
  attributes: unknown,
): Readonly<Record<string, OperationalEventAttributeValue>> | undefined {
  if (attributes === undefined || attributes === null || typeof attributes !== "object") {
    return undefined;
  }

  const source = attributes as Record<string, unknown>;
  const normalised: Record<string, OperationalEventAttributeValue> = {};

  // Iterating the catalogue rather than the input fixes key order and silently
  // drops anything not declared for this event.
  for (const key of Object.keys(OPERATIONAL_EVENT_CATALOGUE[name].attributes)) {
    const value = source[key];

    if (value === undefined) {
      continue;
    }

    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      normalised[key] = value;
    }
  }

  return Object.keys(normalised).length === 0 ? undefined : Object.freeze(normalised);
}

/**
 * Serialises an event as a single line of JSON with no ANSI formatting and no
 * trailing newline, suitable for container log collection.
 */
export function serialiseOperationalEvent(event: OperationalEvent): string {
  return JSON.stringify(event);
}
