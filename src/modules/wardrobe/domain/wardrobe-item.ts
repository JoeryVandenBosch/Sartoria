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
  acquisitionCostMinor?: number | null | undefined;
  acquisitionCurrency?: string | null | undefined;
  createdAt: string;
}>;

export type NewWardrobeItem = Readonly<{
  ownerId: string;
  category: WardrobeCategory;
  name: string;
  brand?: string | null | undefined;
  primaryColor: string;
  ownershipStatus?: OwnershipStatus | undefined;
  fitNotes?: string | null | undefined;
  acquisitionCostMinor?: number | null | undefined;
  acquisitionCurrency?: string | null | undefined;
}>;

/**
 * The fields a person may correct after recording an item.
 *
 * `id`, `ownerId`, and `createdAt` are deliberately absent: identity and
 * ownership are not editable, and the recorded moment is a fact rather than a
 * preference.
 */
export type WardrobeItemRevision = Readonly<{
  category?: WardrobeCategory | undefined;
  name?: string | undefined;
  brand?: string | null | undefined;
  primaryColor?: string | undefined;
  ownershipStatus?: OwnershipStatus | undefined;
  fitNotes?: string | null | undefined;
  acquisitionCostMinor?: number | null | undefined;
  acquisitionCurrency?: string | null | undefined;
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

/**
 * Applies a correction to an existing item.
 *
 * Every rule that governs creation governs a revision: the same required-text,
 * optional-text, and acquisition checks run, so an item can never be edited
 * into a state it could not have been created in.
 *
 * Acquisition is re-derived from the resulting ownership status rather than
 * carried forward. Moving an item off `owned` therefore clears its acquisition
 * cost rather than leaving a cost attached to something the person does not
 * own, which the domain forbids. Moving an item to `owned` accepts a cost.
 *
 * Absent fields are left unchanged. An explicit `null` clears an optional field.
 */
export function reviseWardrobeItem(
  item: WardrobeItem,
  revision: WardrobeItemRevision,
): WardrobeItem {
  const ownershipStatus = revision.ownershipStatus ?? item.ownershipStatus;

  const nextCost =
    revision.acquisitionCostMinor !== undefined
      ? revision.acquisitionCostMinor
      : (item.acquisitionCostMinor ?? null);
  const nextCurrency =
    revision.acquisitionCurrency !== undefined
      ? revision.acquisitionCurrency
      : (item.acquisitionCurrency ?? null);

  // Acquisition belongs only to an owned item. Rather than rejecting a status
  // change that would strand a cost, the cost is dropped with the status.
  const acquisition =
    ownershipStatus === "owned"
      ? acquisitionFacts(ownershipStatus, nextCost, nextCurrency)
      : acquisitionFacts(ownershipStatus, null, null);

  return Object.freeze({
    id: item.id,
    ownerId: item.ownerId,
    category: revision.category ?? item.category,
    name: requiredText("name", revision.name ?? item.name),
    brand:
      revision.brand !== undefined ? optionalText("brand", revision.brand) : item.brand,
    primaryColor: requiredText("primaryColor", revision.primaryColor ?? item.primaryColor),
    ownershipStatus,
    fitNotes:
      revision.fitNotes !== undefined
        ? optionalText("fitNotes", revision.fitNotes)
        : item.fitNotes,
    ...acquisition,
    createdAt: item.createdAt,
  });
}
