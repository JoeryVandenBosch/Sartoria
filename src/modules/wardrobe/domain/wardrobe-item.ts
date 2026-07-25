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

export function createWardrobeItem(
  input: NewWardrobeItem,
  dependencies: WardrobeItemFactoryDependencies,
): WardrobeItem {
  const id = dependencies.createId().trim();
  if (id.length === 0) {
    throw new Error("Wardrobe item id factory returned an empty identifier");
  }

  return Object.freeze({
    id,
    ownerId: requiredText("ownerId", input.ownerId),
    category: input.category,
    name: requiredText("name", input.name),
    brand: optionalText("brand", input.brand),
    primaryColor: requiredText("primaryColor", input.primaryColor),
    ownershipStatus: input.ownershipStatus ?? "owned",
    fitNotes: optionalText("fitNotes", input.fitNotes),
    createdAt: dependencies.now().toISOString(),
  });
}
