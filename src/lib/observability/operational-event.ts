/**
 * Provider-neutral operational event model.
 *
 * Privacy is enforced by construction, not by convention:
 *
 * - Event names are allow-listed.
 * - Attribute keys are allow-listed per event.
 * - Attribute values may only be a boolean, a bounded non-negative integer
 *   count, or a value drawn from a declared enumeration for that key.
 *
 * Free-form strings are therefore not representable. An email address, user
 * identifier, media key, signed URL, prompt, measurement, destination, token,
 * or exception message cannot be expressed by this schema even by mistake.
 */

export const OPERATIONAL_EVENT_SCHEMA_VERSION = 1;

export const OPERATIONAL_EVENT_SEVERITIES = ["info", "warning", "error"] as const;
export type OperationalEventSeverity = (typeof OPERATIONAL_EVENT_SEVERITIES)[number];

export const OPERATIONAL_EVENT_OUTCOMES = ["success", "failure", "degraded", "skipped"] as const;
export type OperationalEventOutcome = (typeof OPERATIONAL_EVENT_OUTCOMES)[number];

export const DEPLOYMENT_ENVIRONMENTS = [
  "development",
  "test",
  "staging",
  "production",
  "unknown",
] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

/** Upper bound for any numeric attribute or duration, guarding unbounded values. */
export const MAX_NUMERIC_ATTRIBUTE = 86_400_000;

/** Bounded classification for failures. Never a message, stack trace, or cause chain. */
export const FAILURE_CLASSIFICATIONS = [
  "configuration",
  "dependency-unavailable",
  "timeout",
  "validation",
  "not-authorised",
  "not-found",
  "conflict",
  "unexpected",
] as const;
export type FailureClassification = (typeof FAILURE_CLASSIFICATIONS)[number];

type AttributeSpecification =
  | { readonly kind: "boolean" }
  | { readonly kind: "count" }
  | { readonly kind: "enum"; readonly values: readonly [string, ...string[]] };

const BOOLEAN = { kind: "boolean" } as const;
const COUNT = { kind: "count" } as const;
const FAILURE_CLASSIFICATION = {
  kind: "enum",
  values: FAILURE_CLASSIFICATIONS,
} as const;

/**
 * The complete catalogue of emittable events and their permitted attributes.
 * Adding an event or attribute is a deliberate, reviewable change.
 */
export const OPERATIONAL_EVENT_CATALOGUE = {
  /** Session resolution outcome. Carries no account identity of any kind. */
  "auth.session.resolved": {
    attributes: {
      identitySource: { kind: "enum", values: ["development", "better-auth"] },
      authenticated: BOOLEAN,
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },

  /** Database readiness probe outcome. */
  "database.readiness.checked": {
    attributes: {
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },

  /**
   * Media processing lifecycle. Never a file name, quarantine or private key,
   * signed URL, byte content, scan reference, scanner name, or owner.
   *
   * Values mirror the media domain vocabulary so operators read the same terms
   * the code uses.
   */
  "media.processing.completed": {
    attributes: {
      /** Terminal disposition of the pipeline run. */
      disposition: {
        kind: "enum",
        values: ["ready", "rejected", "failed", "skipped"],
      },
      /** Mirrors MediaScanVerdict. */
      scanVerdict: { kind: "enum", values: ["safe", "malicious", "unsupported"] },
      /** Mirrors the domain rejection codes. */
      rejectionCode: {
        kind: "enum",
        values: ["malware-detected", "unsupported-type"],
      },
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },

  /** Recommendation generation. No prompt, profile, wardrobe item, or provider payload. */
  "recommendation.generation.completed": {
    attributes: {
      generationSource: { kind: "enum", values: ["provider", "fallback"] },
      fellBackToDeterministic: BOOLEAN,
      fallbackReason: {
        kind: "enum",
        values: [
          "provider-not-configured",
          "provider-failed",
          "provider-output-invalid",
          "provider-reference-invalid",
          "provider-confidence-low",
        ],
      },
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },

  /** Staging identity bootstrap. No email, identifier, password, token, or operator. */
  "staging.identity.bootstrapped": {
    attributes: {
      identitiesCreated: COUNT,
      identitiesAlreadyPresent: COUNT,
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },

  /** Emitted only by the local failure signal when a sink itself fails. Never recursive. */
  "observability.sink.failed": {
    attributes: {
      failureClassification: FAILURE_CLASSIFICATION,
    },
  },
} as const satisfies Record<string, { attributes: Record<string, AttributeSpecification> }>;

export type OperationalEventName = keyof typeof OPERATIONAL_EVENT_CATALOGUE;

type Catalogue = typeof OPERATIONAL_EVENT_CATALOGUE;

type AttributeValueOf<S> = S extends { kind: "boolean" }
  ? boolean
  : S extends { kind: "count" }
    ? number
    : S extends { kind: "enum"; values: readonly (infer V)[] }
      ? V
      : never;

/** Compile-time permitted attributes for a given event name. */
export type OperationalEventAttributes<N extends OperationalEventName> = {
  readonly [K in keyof Catalogue[N]["attributes"]]?: AttributeValueOf<Catalogue[N]["attributes"][K]>;
};

export type OperationalEventAttributeValue = boolean | number | string;

/** What a caller supplies. Timestamp, environment, and release are added by the emitter. */
export interface OperationalEventInput<N extends OperationalEventName = OperationalEventName> {
  readonly name: N;
  readonly severity: OperationalEventSeverity;
  readonly outcome: OperationalEventOutcome;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly attributes?: OperationalEventAttributes<N>;
}

/** The serialised envelope handed to a sink. Key order is fixed for deterministic output. */
export interface OperationalEvent {
  readonly schemaVersion: number;
  readonly name: OperationalEventName;
  readonly severity: OperationalEventSeverity;
  readonly timestamp: string;
  readonly environment: DeploymentEnvironment;
  readonly outcome: OperationalEventOutcome;
  readonly release?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly attributes?: Readonly<Record<string, OperationalEventAttributeValue>>;
}

export function isOperationalEventName(value: unknown): value is OperationalEventName {
  return typeof value === "string" && Object.hasOwn(OPERATIONAL_EVENT_CATALOGUE, value);
}

function attributeSpecificationsFor(
  name: OperationalEventName,
): Readonly<Record<string, AttributeSpecification>> {
  return OPERATIONAL_EVENT_CATALOGUE[name].attributes as Readonly<
    Record<string, AttributeSpecification>
  >;
}

export function isBoundedNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_NUMERIC_ATTRIBUTE
  );
}

function validateAttributeValue(specification: AttributeSpecification, value: unknown): boolean {
  switch (specification.kind) {
    case "boolean":
      return typeof value === "boolean";
    case "count":
      return isBoundedNumber(value);
    case "enum":
      return typeof value === "string" && specification.values.includes(value);
  }
}

export type AttributeValidationFailure =
  | "unknown-event-name"
  | "unknown-attribute-key"
  | "invalid-attribute-value";

export interface AttributeValidationResult {
  readonly valid: boolean;
  readonly failure?: AttributeValidationFailure;
  /** The offending key, which is always an allow-listed identifier, never user content. */
  readonly key?: string;
}

/**
 * Validates supplied attributes against the catalogue. Rejects unknown keys,
 * nested objects, arrays, null, non-finite and negative numbers, oversized
 * numbers, and any string outside a declared enumeration.
 */
export function validateAttributes(name: unknown, attributes: unknown): AttributeValidationResult {
  if (!isOperationalEventName(name)) {
    return { valid: false, failure: "unknown-event-name" };
  }

  if (attributes === undefined) {
    return { valid: true };
  }

  if (typeof attributes !== "object" || attributes === null || Array.isArray(attributes)) {
    return { valid: false, failure: "invalid-attribute-value" };
  }

  const specifications = attributeSpecificationsFor(name);

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) {
      continue;
    }

    const specification = specifications[key];
    if (specification === undefined) {
      return { valid: false, failure: "unknown-attribute-key", key };
    }

    if (!validateAttributeValue(specification, value)) {
      return { valid: false, failure: "invalid-attribute-value", key };
    }
  }

  return { valid: true };
}
