export const recommendationSchemaVersion = "1" as const;
export const recommendationConfidenceLevels = ["low", "medium", "high"] as const;
export const recommendationStatuses = ["active", "rejected"] as const;

export type RecommendationConfidence = (typeof recommendationConfidenceLevels)[number];
export type RecommendationStatus = (typeof recommendationStatuses)[number];

export type RecommendationRequest = Readonly<{
  occasion: string;
  notes: string | null;
}>;

export type RecommendationItemReason = Readonly<{
  itemId: string;
  reason: string;
}>;

export type RecommendationProvenance = Readonly<{
  kind: "provider" | "fallback";
  provider: string | null;
  model: string | null;
  reasonCode: string | null;
  schemaVersion: typeof recommendationSchemaVersion;
}>;

export type WardrobeRecommendation = Readonly<{
  id: string;
  ownerId: string;
  request: RecommendationRequest;
  itemReasons: readonly RecommendationItemReason[];
  summary: string;
  exclusions: readonly string[];
  confidence: RecommendationConfidence;
  provenance: RecommendationProvenance;
  status: RecommendationStatus;
  correction: string | null;
  rejectionReason: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}>;

export class WardrobeRecommendationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WardrobeRecommendationValidationError";
  }
}

const controlCharacters = /[\u0000-\u001F\u007F]/u;
const noteControlCharacters = /[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    throw new WardrobeRecommendationValidationError(`${field} is required.`);
  }
  if (normalized.length > maximum) {
    throw new WardrobeRecommendationValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  if (controlCharacters.test(normalized)) {
    throw new WardrobeRecommendationValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

function optionalNote(value: string | null | undefined, field: string, maximum: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim().replace(/\r\n?/gu, "\n");
  if (!normalized) {
    return null;
  }
  if (normalized.length > maximum) {
    throw new WardrobeRecommendationValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  if (noteControlCharacters.test(normalized)) {
    throw new WardrobeRecommendationValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

function normalizedItemReasons(values: readonly RecommendationItemReason[]): readonly RecommendationItemReason[] {
  if (values.length < 2 || values.length > 12) {
    throw new WardrobeRecommendationValidationError(
      "A recommendation must reference between 2 and 12 wardrobe items.",
    );
  }

  const normalized = values.map((value) =>
    Object.freeze({
      itemId: requiredText(value.itemId, "Wardrobe item identifier", 128),
      reason: requiredText(value.reason, "Item reason", 280),
    }),
  );

  if (new Set(normalized.map((value) => value.itemId)).size !== normalized.length) {
    throw new WardrobeRecommendationValidationError(
      "A recommendation cannot reference the same wardrobe item more than once.",
    );
  }

  return Object.freeze(normalized);
}

function normalizedExclusions(values: readonly string[]): readonly string[] {
  if (values.length > 8) {
    throw new WardrobeRecommendationValidationError(
      "A recommendation cannot contain more than 8 exclusions.",
    );
  }
  const normalized = values.map((value) => requiredText(value, "Exclusion", 160));
  if (new Set(normalized.map((value) => value.toLocaleLowerCase("en"))).size !== normalized.length) {
    throw new WardrobeRecommendationValidationError("Recommendation exclusions must be unique.");
  }
  return Object.freeze(normalized);
}

export function createWardrobeRecommendation(input: Readonly<{
  id: string;
  ownerId: string;
  request: RecommendationRequest;
  itemReasons: readonly RecommendationItemReason[];
  summary: string;
  exclusions: readonly string[];
  confidence: RecommendationConfidence;
  provenance: Omit<RecommendationProvenance, "schemaVersion">;
  now: Date;
  expiresAt: Date;
}>): WardrobeRecommendation {
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    throw new WardrobeRecommendationValidationError("Recommendation expiry must be in the future.");
  }

  const timestamp = input.now.toISOString();
  return Object.freeze({
    id: requiredText(input.id, "Recommendation identifier", 128),
    ownerId: requiredText(input.ownerId, "Owner identifier", 128),
    request: Object.freeze({
      occasion: requiredText(input.request.occasion, "Occasion", 120),
      notes: optionalNote(input.request.notes, "Request notes", 500),
    }),
    itemReasons: normalizedItemReasons(input.itemReasons),
    summary: requiredText(input.summary, "Recommendation summary", 600),
    exclusions: normalizedExclusions(input.exclusions),
    confidence: input.confidence,
    provenance: Object.freeze({
      ...input.provenance,
      provider: input.provenance.provider
        ? requiredText(input.provenance.provider, "Provider", 80)
        : null,
      model: input.provenance.model
        ? requiredText(input.provenance.model, "Model", 120)
        : null,
      reasonCode: input.provenance.reasonCode
        ? requiredText(input.provenance.reasonCode, "Fallback reason code", 80)
        : null,
      schemaVersion: recommendationSchemaVersion,
    }),
    status: "active",
    correction: null,
    rejectionReason: null,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: input.expiresAt.toISOString(),
  });
}

export function rejectWardrobeRecommendation(
  current: WardrobeRecommendation,
  reason: string | null,
  now: Date,
): WardrobeRecommendation {
  return Object.freeze({
    ...current,
    status: "rejected",
    rejectionReason: optionalNote(reason, "Rejection reason", 500),
    revision: current.revision + 1,
    updatedAt: now.toISOString(),
  });
}

export function correctWardrobeRecommendation(
  current: WardrobeRecommendation,
  correction: string,
  now: Date,
): WardrobeRecommendation {
  return Object.freeze({
    ...current,
    correction: requiredText(correction, "Correction", 600),
    revision: current.revision + 1,
    updatedAt: now.toISOString(),
  });
}

export function isRecommendationExpired(recommendation: WardrobeRecommendation, now: Date): boolean {
  return new Date(recommendation.expiresAt).getTime() <= now.getTime();
}
