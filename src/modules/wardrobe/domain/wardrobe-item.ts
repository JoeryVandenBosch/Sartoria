export const wardrobeCategories = [
  "outerwear",
  "tailoring",
  "knitwear",
  "shirts",
  "tops",
  "trousers",
  "denim",
  "dresses",
  "skirts",
  "footwear",
  "accessories",
  "activewear",
  "other",
] as const;

export const ownershipStatuses = ["owned", "wish-list", "archived"] as const;

export type WardrobeCategory = (typeof wardrobeCategories)[number];
export type OwnershipStatus = (typeof ownershipStatuses)[number];

export type WardrobeItem = Readonly<{
  id: string;
  ownerId: string;
  category: WardrobeCategory;
  name: string;
  brand: string | null;
  primaryColor: string;
  ownershipStatus: OwnershipStatus;
  fitNotes: string | null;
  acquisitionCostMinor?: number | null;
  acquisitionCurrency?: string | null;
  createdAt: string;
}>;

export type NewWardrobeItem = Readonly<{
  ownerId: string;
  category: WardrobeCategory;
  name: string;
  brand?: string | null;
  primaryColor: string;
  ownershipStatus?: OwnershipStatus;
  fitNotes?: string | null;
  acquisitionCostMinor?: number | null;
  acquisitionCurrency?: string | null;
}>;

export type WardrobeItemFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

export class WardrobeItemValidationError extends Error {
  readonly field: keyof NewWardrobeItem;

  constructor(field: keyof NewWardrobeItem, message: string) {
    super(message);
    this.name = "WardrobeItemValidationError";
    this.field = field;
  }
}

const limits = {
  ownerId: 128,
  name: 120,
  brand: 120,
  primaryColor: 80,
  fitNotes: 500,
  acquisitionCostMinor: 100_000_000_000,
} as const;

function requiredText(
  field: "ownerId" | "name" | "primaryColor",
  value: string,
): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new WardrobeItemValidationError(field, `${field} is required`);
  }

  if (normalized.length > limits[field]) {
    throw new WardrobeItemValidationError(
      field,
      `${field} must be ${limits[field]} characters or fewer`,
    );
  }

  return normalized;
}

function optionalText(
  field: "brand" | "fitNotes",
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > limits[field]) {
    throw new WardrobeItemValidationError(
      field,
      `${field} must be ${limits[field]} characters or fewer`,
    );
  }

  return normalized;
}

function acquisitionFacts(
  ownershipStatus: OwnershipStatus,
  amount: number | null | undefined,
  currency: string | null | undefined,
): Readonly<{ acquisitionCostMinor: number | null; acquisitionCurrency: string | null }> {
  const normalizedCurrency = currency?.trim().toUpperCase() || null;
  const normalizedAmount = amount ?? null;

  if (normalizedAmount === null && normalizedCurrency === null) {
    return Object.freeze({ acquisitionCostMinor: null, acquisitionCurrency: null });
  }

  if (normalizedAmount === null || normalizedCurrency === null) {
    throw new WardrobeItemValidationError(
      normalizedAmount === null ? "acquisitionCostMinor" : "acquisitionCurrency",
      "Acquisition amount and currency must be recorded together",
    );
  }

  if (
    !Number.isSafeInteger(normalizedAmount) ||
    normalizedAmount < 1 ||
    normalizedAmount > limits.acquisitionCostMinor
  ) {
    throw new WardrobeItemValidationError(
      "acquisitionCostMinor",
      "Acquisition cost must be a positive supported minor-unit amount",
    );
  }

  if (!/^[A-Z]{3}$/u.test(normalizedCurrency)) {
    throw new WardrobeItemValidationError(
      "acquisitionCurrency",
      "Acquisition currency must be a three-letter uppercase code",
    );
  }

  if (ownershipStatus !== "owned") {
    throw new WardrobeItemValidationError(
      "acquisitionCostMinor",
      "Acquisition cost can only be recorded for an owned item",
    );
  }

  return Object.freeze({
    acquisitionCostMinor: normalizedAmount,
    acquisitionCurrency: normalizedCurrency,
  });
}

export function createWardrobeItem(
  input: NewWardrobeItem,
  dependencies: WardrobeItemFactoryDependencies,
): WardrobeItem {
  const id = dependencies.createId().trim();
  if (id.length === 0) {
    throw new Error("Wardrobe item id factory returned an empty identifier");
  }

  const ownershipStatus = input.ownershipStatus ?? "owned";
  const acquisition = acquisitionFacts(
    ownershipStatus,
    input.acquisitionCostMinor,
    input.acquisitionCurrency,
  );

  return Object.freeze({
    id,
    ownerId: requiredText("ownerId", input.ownerId),
    category: input.category,
    name: requiredText("name", input.name),
    brand: optionalText("brand", input.brand),
    primaryColor: requiredText("primaryColor", input.primaryColor),
    ownershipStatus,
    fitNotes: optionalText("fitNotes", input.fitNotes),
    ...acquisition,
    createdAt: dependencies.now().toISOString(),
  });
}
