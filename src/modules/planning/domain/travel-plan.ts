export const travelClimateExpectations = ["cold", "cool", "mild", "warm", "hot", "mixed"] as const;
export const travelActivityContexts = ["everyday", "business", "dinner", "formal", "active", "beach"] as const;
export const travelLaundryAccessLevels = ["none", "limited", "regular"] as const;

export type TravelClimateExpectation = (typeof travelClimateExpectations)[number];
export type TravelActivityContext = (typeof travelActivityContexts)[number];
export type TravelLaundryAccess = (typeof travelLaundryAccessLevels)[number];

export type TravelPlanInput = Readonly<{
  name: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  climate: TravelClimateExpectation;
  activities: readonly TravelActivityContext[];
  laundryAccess: TravelLaundryAccess;
  notes?: string | null;
  wardrobeItemIds: readonly string[];
  packingWarnings?: readonly string[];
}>;

export type TravelPlan = Readonly<{
  id: string;
  ownerId: string;
  name: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  climate: TravelClimateExpectation;
  activities: readonly TravelActivityContext[];
  laundryAccess: TravelLaundryAccess;
  notes: string | null;
  wardrobeItemIds: readonly string[];
  packingWarnings: readonly string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}>;

export class TravelPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TravelPlanValidationError";
  }
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const controlCharacters = /[\u0000-\u001F\u007F]/u;
const noteControlCharacters = /[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    throw new TravelPlanValidationError(`${field} is required.`);
  }
  if (normalized.length > maximum) {
    throw new TravelPlanValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  if (controlCharacters.test(normalized)) {
    throw new TravelPlanValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  field: string,
  maximum: number,
  multiline = false,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = multiline
    ? value.trim().replace(/\r\n?/gu, "\n")
    : value.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    return null;
  }
  if (normalized.length > maximum) {
    throw new TravelPlanValidationError(`${field} must be ${maximum} characters or fewer.`);
  }
  const invalid = multiline ? noteControlCharacters.test(normalized) : controlCharacters.test(normalized);
  if (invalid) {
    throw new TravelPlanValidationError(`${field} contains an invalid control character.`);
  }
  return normalized;
}

export function validateTravelDate(value: string, field: string): string {
  const normalized = value.trim();
  if (!datePattern.test(normalized)) {
    throw new TravelPlanValidationError(`${field} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new TravelPlanValidationError(`${field} is not a valid calendar date.`);
  }
  if (normalized < "1900-01-01" || normalized > "2200-12-31") {
    throw new TravelPlanValidationError(`${field} is outside the supported date range.`);
  }
  return normalized;
}

export function travelDurationDays(startDate: string, endDate: string): number {
  const start = validateTravelDate(startDate, "Start date");
  const end = validateTravelDate(endDate, "End date");
  const milliseconds =
    new Date(`${end}T00:00:00.000Z`).getTime() -
    new Date(`${start}T00:00:00.000Z`).getTime();
  const days = Math.floor(milliseconds / 86_400_000) + 1;
  if (days < 1) {
    throw new TravelPlanValidationError("End date cannot be earlier than start date.");
  }
  if (days > 60) {
    throw new TravelPlanValidationError("A travel plan cannot exceed 60 days.");
  }
  return days;
}

function uniqueActivities(values: readonly TravelActivityContext[]): readonly TravelActivityContext[] {
  const unique = [...new Set(values)];
  if (unique.length < 1 || unique.length > 6) {
    throw new TravelPlanValidationError("Select between 1 and 6 activity contexts.");
  }
  return Object.freeze(unique);
}

function uniqueItemIds(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) => requiredText(value, "Wardrobe item identifier", 128));
  if (normalized.length < 2 || normalized.length > 60) {
    throw new TravelPlanValidationError("A packing list must contain between 2 and 60 items.");
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new TravelPlanValidationError("A packing list cannot contain duplicate wardrobe items.");
  }
  return Object.freeze(normalized);
}

function warnings(values: readonly string[] | undefined): readonly string[] {
  const normalized = (values ?? []).map((value) => requiredText(value, "Packing warning", 240));
  if (normalized.length > 12) {
    throw new TravelPlanValidationError("A travel plan cannot contain more than 12 packing warnings.");
  }
  return Object.freeze([...new Set(normalized)]);
}

export function createTravelPlan(
  input: Readonly<{
    id: string;
    ownerId: string;
    plan: TravelPlanInput;
    now: Date;
  }>,
): TravelPlan {
  travelDurationDays(input.plan.startDate, input.plan.endDate);
  const timestamp = input.now.toISOString();
  return Object.freeze({
    id: requiredText(input.id, "Travel-plan identifier", 128),
    ownerId: requiredText(input.ownerId, "Owner identifier", 128),
    name: requiredText(input.plan.name, "Trip name", 120),
    destination: optionalText(input.plan.destination, "Destination", 120),
    startDate: validateTravelDate(input.plan.startDate, "Start date"),
    endDate: validateTravelDate(input.plan.endDate, "End date"),
    climate: input.plan.climate,
    activities: uniqueActivities(input.plan.activities),
    laundryAccess: input.plan.laundryAccess,
    notes: optionalText(input.plan.notes, "Private trip notes", 1_000, true),
    wardrobeItemIds: uniqueItemIds(input.plan.wardrobeItemIds),
    packingWarnings: warnings(input.plan.packingWarnings),
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function reviseTravelPlan(
  current: TravelPlan,
  plan: TravelPlanInput,
  now: Date,
): TravelPlan {
  const revised = createTravelPlan({ id: current.id, ownerId: current.ownerId, plan, now });
  return Object.freeze({
    ...revised,
    revision: current.revision + 1,
    createdAt: current.createdAt,
  });
}
