import {
  createWardrobeItem,
  type NewWardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";
import type { InMemoryWardrobeItemRepository } from "./in-memory-wardrobe-item-repository";

/**
 * Optional synthetic wardrobe for local exploration.
 *
 * This exists so the application can be evaluated in a realistic state without
 * hand-entering items. It is deliberately constrained:
 *
 * - it never runs in production;
 * - it only runs when explicitly requested through `SARTORIA_DEV_SEED=true`,
 *   so default development and the end-to-end suite continue to start from an
 *   empty wardrobe;
 * - it only touches the in-memory development repository and never writes to
 *   PostgreSQL;
 * - every value is invented. No real person, purchase, measurement, or
 *   photograph is represented.
 *
 * The data is shaped to make derived features legible: overlapping navy
 * tailoring so duplication analysis has something to find, a spread of
 * acquisition costs so cost-per-wear varies, and two wish-list entries so
 * purchase-impact analysis has candidates.
 */

const SEED_OWNER_ID = "sartoria-development-user";

const SEED_ITEMS: readonly Omit<NewWardrobeItem, "ownerId">[] = [
  {
    category: "tailoring",
    name: "Navy wool blazer",
    brand: "Lardini",
    primaryColor: "Navy",
    ownershipStatus: "owned",
    acquisitionCostMinor: 48_000,
    acquisitionCurrency: "EUR",
    fitNotes: "Sleeves shortened 1.5cm. Sits well over knitwear.",
  },
  {
    category: "tailoring",
    name: "Navy hopsack jacket",
    brand: "Boglioli",
    primaryColor: "Navy",
    ownershipStatus: "owned",
    acquisitionCostMinor: 52_500,
    acquisitionCurrency: "EUR",
    fitNotes: "Unstructured. Warmer months.",
  },
  {
    category: "tailoring",
    name: "Charcoal suit trousers",
    brand: "Lardini",
    primaryColor: "Charcoal",
    ownershipStatus: "owned",
    acquisitionCostMinor: 19_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "knitwear",
    name: "Cream merino crewneck",
    brand: "Gran Sasso",
    primaryColor: "Cream",
    ownershipStatus: "owned",
    acquisitionCostMinor: 16_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "knitwear",
    name: "Charcoal lambswool cardigan",
    brand: "Drumohr",
    primaryColor: "Charcoal",
    ownershipStatus: "owned",
    acquisitionCostMinor: 22_000,
    acquisitionCurrency: "EUR",
    fitNotes: "Slightly long in the body.",
  },
  {
    category: "shirts",
    name: "White oxford shirt",
    brand: "Mazzarelli",
    primaryColor: "White",
    ownershipStatus: "owned",
    acquisitionCostMinor: 12_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "shirts",
    name: "Pale blue poplin shirt",
    brand: "Mazzarelli",
    primaryColor: "Pale blue",
    ownershipStatus: "owned",
    acquisitionCostMinor: 12_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "shirts",
    name: "White linen shirt",
    primaryColor: "White",
    ownershipStatus: "owned",
    acquisitionCostMinor: 9_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "trousers",
    name: "Stone cotton chinos",
    brand: "Incotex",
    primaryColor: "Stone",
    ownershipStatus: "owned",
    acquisitionCostMinor: 17_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "trousers",
    name: "Olive cotton trousers",
    brand: "Incotex",
    primaryColor: "Olive",
    ownershipStatus: "owned",
    acquisitionCostMinor: 16_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "denim",
    name: "Indigo selvedge jeans",
    brand: "Jacob Cohën",
    primaryColor: "Indigo",
    ownershipStatus: "owned",
    acquisitionCostMinor: 24_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "outerwear",
    name: "Navy wool overcoat",
    brand: "Herno",
    primaryColor: "Navy",
    ownershipStatus: "owned",
    acquisitionCostMinor: 68_000,
    acquisitionCurrency: "EUR",
    fitNotes: "Roomy enough for a jacket underneath.",
  },
  {
    category: "outerwear",
    name: "Tan suede bomber",
    primaryColor: "Tan",
    // No acquisition cost: the domain records cost only for owned items.
    ownershipStatus: "archived",
    fitNotes: "Tight across the shoulders. Kept for now.",
  },
  {
    category: "footwear",
    name: "Dark brown leather loafers",
    brand: "Velasca",
    primaryColor: "Dark brown",
    ownershipStatus: "owned",
    acquisitionCostMinor: 21_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "footwear",
    name: "White leather sneakers",
    brand: "Common Projects",
    primaryColor: "White",
    ownershipStatus: "owned",
    acquisitionCostMinor: 34_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "footwear",
    name: "Black derby shoes",
    primaryColor: "Black",
    ownershipStatus: "owned",
    acquisitionCostMinor: 27_500,
    acquisitionCurrency: "EUR",
    fitNotes: "Worn twice. Slightly narrow.",
  },
  {
    category: "accessories",
    name: "Brown leather belt",
    primaryColor: "Brown",
    ownershipStatus: "owned",
    acquisitionCostMinor: 8_500,
    acquisitionCurrency: "EUR",
  },
  {
    category: "accessories",
    name: "Charcoal cashmere scarf",
    primaryColor: "Charcoal",
    ownershipStatus: "owned",
    acquisitionCostMinor: 14_000,
    acquisitionCurrency: "EUR",
  },
  {
    category: "tailoring",
    name: "Mid-grey flannel suit",
    brand: "Caruso",
    primaryColor: "Mid grey",
    ownershipStatus: "wish-list",
  },
  {
    category: "footwear",
    name: "Burgundy suede loafers",
    brand: "Velasca",
    primaryColor: "Burgundy",
    ownershipStatus: "wish-list",
  },
];

export function developmentSeedRequested(
  flag: string | undefined = process.env.SARTORIA_DEV_SEED,
  nodeEnvironment: string | undefined = process.env.NODE_ENV,
): boolean {
  return (
    nodeEnvironment !== "production" && flag?.trim().toLowerCase() === "true"
  );
}

/**
 * Populates the in-memory repository when seeding is requested and the
 * wardrobe is still empty. Safe to call repeatedly: it is a no-op once items
 * exist, so a hot reload cannot duplicate the collection.
 */
export async function seedDevelopmentWardrobe(
  repository: InMemoryWardrobeItemRepository,
): Promise<void> {
  if (!developmentSeedRequested()) {
    return;
  }

  const existing = await repository.listByOwner(SEED_OWNER_ID);
  if (existing.length > 0) {
    return;
  }

  // Fixed identifiers and timestamps keep the seeded wardrobe deterministic
  // across restarts, which matters when comparing screenshots or insights.
  const base = new Date("2026-01-15T09:00:00.000Z").getTime();

  for (const [index, item] of SEED_ITEMS.entries()) {
    try {
      await repository.save(
        createWardrobeItem(
          { ...item, ownerId: SEED_OWNER_ID },
          {
            createId: () => `seed-item-${String(index + 1).padStart(2, "0")}`,
            now: () => new Date(base + index * 86_400_000),
          },
        ),
      );
    } catch (error) {
      // A rejected seed item is a defect in this file, not a runtime condition.
      // Reporting it and continuing prevents one bad entry from silently
      // truncating the whole collection, which is how an earlier version
      // produced twelve items instead of twenty.
      console.error(
        `[sartoria] development seed item ${index + 1} (${item.name}) was rejected:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
