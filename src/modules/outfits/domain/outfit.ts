export const minimumOutfitItems = 2;
export const maximumOutfitItems = 12;

export type Outfit = Readonly<{
  id: string;
  ownerId: string;
  name: string;
  occasion: string | null;
  stylingNotes: string | null;
  wardrobeItemIds: readonly string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}>;

export type OutfitInput = Readonly<{
  name: string;
  occasion?: string | null;
  stylingNotes?: string | null;
  wardrobeItemIds: readonly string[];
}>;

export class OutfitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutfitValidationError";
  }
}

const controlCharacters = /[\u0000-\u001F\u007F]/u;

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    throw new OutfitValidationError(`${field} is required.`);
  }
  if (normalized.length > maximum) {
    throw new OutfitValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  if (controlCharacters.test(normalized)) {
    throw new OutfitValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  field: string,
  maximum: number,
  preserveLineBreaks = false,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = preserveLineBreaks
    ? value.trim().replace(/\r\n?/gu, "\n")
    : value.trim().replace(/\s+/gu, " ");

  if (!normalized) {
    return null;
  }
  if (normalized.length > maximum) {
    throw new OutfitValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  if (/\u0000|\u0008|\u000B|\u000C|\u000E-\u001F|\u007F/u.test(normalized)) {
    throw new OutfitValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

function itemIds(values: readonly string[]): readonly string[] {
  if (values.length < minimumOutfitItems || values.length > maximumOutfitItems) {
    throw new OutfitValidationError(
      `An outfit must contain between ${minimumOutfitItems} and ${maximumOutfitItems} wardrobe items.`,
    );
  }

  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => !value || value.length > 128 || controlCharacters.test(value))) {
    throw new OutfitValidationError("Wardrobe item identifiers are invalid.");
  }

  if (new Set(normalized).size !== normalized.length) {
    throw new OutfitValidationError("An outfit cannot contain the same wardrobe item more than once.");
  }

  return Object.freeze(normalized);
}

function normalizeOutfitInput(input: OutfitInput) {
  return Object.freeze({
    name: requiredText(input.name, "Outfit name", 120),
    occasion: optionalText(input.occasion, "Occasion", 80),
    stylingNotes: optionalText(input.stylingNotes, "Private styling notes", 1_000, true),
    wardrobeItemIds: itemIds(input.wardrobeItemIds),
  });
}

export function createOutfit(
  input: Readonly<{
    id: string;
    ownerId: string;
    outfit: OutfitInput;
    now: Date;
  }>,
): Outfit {
  const id = requiredText(input.id, "Outfit identifier", 128);
  const ownerId = requiredText(input.ownerId, "Owner identifier", 128);
  const normalized = normalizeOutfitInput(input.outfit);
  const timestamp = input.now.toISOString();

  return Object.freeze({
    id,
    ownerId,
    ...normalized,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateOutfit(current: Outfit, input: OutfitInput, now: Date): Outfit {
  return Object.freeze({
    id: current.id,
    ownerId: current.ownerId,
    ...normalizeOutfitInput(input),
    revision: current.revision + 1,
    createdAt: current.createdAt,
    updatedAt: now.toISOString(),
  });
}
