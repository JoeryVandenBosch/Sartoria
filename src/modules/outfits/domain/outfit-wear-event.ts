export type OutfitWearEvent = Readonly<{
  id: string;
  outfitId: string;
  ownerId: string;
  wornOn: string;
  note: string | null;
  createdAt: string;
}>;

export type OutfitWearEventInput = Readonly<{
  wornOn: string;
  note?: string | null;
}>;

export class OutfitWearEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutfitWearEventValidationError";
  }
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const controlCharacters = /[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function requiredIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || /[\u0000-\u001F\u007F]/u.test(normalized)) {
    throw new OutfitWearEventValidationError(`${field} is invalid.`);
  }
  return normalized;
}

export function validateWearDate(value: string, now: Date): string {
  const normalized = value.trim();
  if (!datePattern.test(normalized)) {
    throw new OutfitWearEventValidationError("Wear date must use YYYY-MM-DD.");
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new OutfitWearEventValidationError("Wear date is not a valid calendar date.");
  }
  if (normalized < "1900-01-01") {
    throw new OutfitWearEventValidationError("Wear date cannot be earlier than 1900-01-01.");
  }
  if (normalized > now.toISOString().slice(0, 10)) {
    throw new OutfitWearEventValidationError("Wear date cannot be in the future.");
  }

  return normalized;
}

function optionalNote(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim().replace(/\r\n?/gu, "\n");
  if (!normalized) {
    return null;
  }
  if (normalized.length > 500) {
    throw new OutfitWearEventValidationError("Private wear note must be 500 characters or fewer.");
  }
  if (controlCharacters.test(normalized)) {
    throw new OutfitWearEventValidationError("Private wear note contains an invalid control character.");
  }
  return normalized;
}

export function createOutfitWearEvent(
  input: Readonly<{
    id: string;
    outfitId: string;
    ownerId: string;
    event: OutfitWearEventInput;
    now: Date;
  }>,
): OutfitWearEvent {
  return Object.freeze({
    id: requiredIdentifier(input.id, "Wear-event identifier"),
    outfitId: requiredIdentifier(input.outfitId, "Outfit identifier"),
    ownerId: requiredIdentifier(input.ownerId, "Owner identifier"),
    wornOn: validateWearDate(input.event.wornOn, input.now),
    note: optionalNote(input.event.note),
    createdAt: input.now.toISOString(),
  });
}
