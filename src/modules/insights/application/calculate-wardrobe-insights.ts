import type { Outfit } from "@/modules/outfits/domain/outfit";
import type { OutfitWearEvent } from "@/modules/outfits/domain/outfit-wear-event";
import type {
  DuplicateCluster,
  DuplicationRisk,
  FunctionalCoverage,
  ItemUsageInsight,
  UnderuseStatus,
  WardrobeInsights,
  WishListImpact,
} from "@/modules/insights/domain/wardrobe-insights";
import {
  wardrobeCategories,
  type WardrobeCategory,
  type WardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

export type OutfitWearHistory = Readonly<{
  outfit: Outfit;
  events: readonly OutfitWearEvent[];
}>;

const functionalGroups: readonly Readonly<{
  id: string;
  label: string;
  categories: readonly WardrobeCategory[];
}>[] = [
  { id: "upper-layers", label: "Upper layers", categories: ["shirts", "tops", "knitwear"] },
  {
    id: "lower-or-one-piece",
    label: "Lower or one-piece coverage",
    categories: ["trousers", "denim", "skirts", "dresses"],
  },
  { id: "footwear", label: "Footwear", categories: ["footwear"] },
  {
    id: "finishing-layers",
    label: "Finishing or weather layers",
    categories: ["outerwear", "tailoring"],
  },
] as const;

function normalize(value: string | null): string {
  return (value ?? "").trim().toLocaleLowerCase("en").replace(/\s+/gu, " ");
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function itemSetKey(itemIds: readonly string[]): string {
  return sortedUnique(itemIds).join("\u0000");
}

function functionalCoverage(owned: readonly WardrobeItem[]): readonly FunctionalCoverage[] {
  return Object.freeze(
    functionalGroups.map((group) => {
      const sourceItemIds = owned
        .filter((item) => group.categories.includes(item.category))
        .map((item) => item.id)
        .sort((left, right) => left.localeCompare(right));
      return Object.freeze({
        id: group.id,
        label: group.label,
        categories: Object.freeze([...group.categories]),
        ownedCount: sourceItemIds.length,
        status: sourceItemIds.length > 0 ? "covered" : "gap",
        sourceItemIds: Object.freeze(sourceItemIds),
      });
    }),
  );
}

function groupItems(
  owned: readonly WardrobeItem[],
  keyFactory: (item: WardrobeItem) => string,
): Map<string, WardrobeItem[]> {
  const groups = new Map<string, WardrobeItem[]>();
  for (const item of owned) {
    const key = keyFactory(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return groups;
}

function duplicateClusters(owned: readonly WardrobeItem[]): readonly DuplicateCluster[] {
  const exactGroups = groupItems(
    owned,
    (item) => `${item.category}\u0000${normalize(item.primaryColor)}\u0000${normalize(item.brand)}`,
  );
  const exact: DuplicateCluster[] = [];
  const exactItemSets = new Set<string>();

  for (const items of exactGroups.values()) {
    if (items.length < 2) {
      continue;
    }
    const sorted = [...items].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    exactItemSets.add(itemSetKey(sorted.map((item) => item.id)));
    const first = sorted[0];
    if (!first) {
      continue;
    }
    exact.push(
      Object.freeze({
        kind: "exact-signal",
        category: first.category,
        normalizedColour: normalize(first.primaryColor),
        normalizedBrand: normalize(first.brand) || null,
        itemIds: Object.freeze(sorted.map((item) => item.id)),
        matchingFacts: Object.freeze([
          `Category: ${first.category}`,
          `Primary colour: ${first.primaryColor}`,
          `Brand: ${first.brand ?? "not recorded"}`,
        ]),
      }),
    );
  }

  const nearGroups = groupItems(
    owned,
    (item) => `${item.category}\u0000${normalize(item.primaryColor)}`,
  );
  const near: DuplicateCluster[] = [];
  for (const items of nearGroups.values()) {
    if (items.length < 2) {
      continue;
    }
    const sorted = [...items].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    if (exactItemSets.has(itemSetKey(sorted.map((item) => item.id)))) {
      continue;
    }
    const first = sorted[0];
    if (!first) {
      continue;
    }
    near.push(
      Object.freeze({
        kind: "near-signal",
        category: first.category,
        normalizedColour: normalize(first.primaryColor),
        normalizedBrand: null,
        itemIds: Object.freeze(sorted.map((item) => item.id)),
        matchingFacts: Object.freeze([
          `Category: ${first.category}`,
          `Primary colour: ${first.primaryColor}`,
          "Brand may differ or may not be recorded.",
        ]),
      }),
    );
  }

  return Object.freeze(
    [...exact, ...near].sort((left, right) => {
      const kind = left.kind.localeCompare(right.kind);
      if (kind !== 0) {
        return kind;
      }
      const category = left.category.localeCompare(right.category);
      if (category !== 0) {
        return category;
      }
      return left.normalizedColour.localeCompare(right.normalizedColour);
    }),
  );
}

function underuseStatus(totalWearEvents: number, attributedWearCount: number): UnderuseStatus {
  if (totalWearEvents === 0) {
    return "unavailable";
  }
  if (attributedWearCount === 0) {
    return "not-recorded";
  }
  if (attributedWearCount === 1 && totalWearEvents >= 3) {
    return "light-use";
  }
  return "used";
}

function itemUsage(
  owned: readonly WardrobeItem[],
  history: readonly OutfitWearHistory[],
): readonly ItemUsageInsight[] {
  const state = new Map<
    string,
    { outfitMembershipCount: number; attributedWearCount: number; lastWornOn: string | null }
  >();
  for (const item of owned) {
    state.set(item.id, {
      outfitMembershipCount: 0,
      attributedWearCount: 0,
      lastWornOn: null,
    });
  }

  const totalWearEvents = history.reduce((total, entry) => total + entry.events.length, 0);
  for (const entry of history) {
    const ownerItemIds = entry.outfit.wardrobeItemIds.filter((itemId) => state.has(itemId));
    for (const itemId of ownerItemIds) {
      const current = state.get(itemId);
      if (!current) {
        continue;
      }
      current.outfitMembershipCount += 1;
      current.attributedWearCount += entry.events.length;
      for (const event of entry.events) {
        if (current.lastWornOn === null || event.wornOn > current.lastWornOn) {
          current.lastWornOn = event.wornOn;
        }
      }
    }
  }

  return Object.freeze(
    owned
      .map((item) => {
        const usage = state.get(item.id) ?? {
          outfitMembershipCount: 0,
          attributedWearCount: 0,
          lastWornOn: null,
        };
        const canCalculateCost =
          item.acquisitionCostMinor !== null &&
          item.acquisitionCurrency !== null &&
          usage.attributedWearCount > 0;
        return Object.freeze({
          itemId: item.id,
          outfitMembershipCount: usage.outfitMembershipCount,
          attributedWearCount: usage.attributedWearCount,
          lastWornOn: usage.lastWornOn,
          underuseStatus: underuseStatus(totalWearEvents, usage.attributedWearCount),
          costPerWearMinor: canCalculateCost
            ? Math.round((item.acquisitionCostMinor ?? 0) / usage.attributedWearCount)
            : null,
          costCurrency: canCalculateCost ? item.acquisitionCurrency : null,
        });
      })
      .sort((left, right) => {
        const wear = left.attributedWearCount - right.attributedWearCount;
        if (wear !== 0) {
          return wear;
        }
        return left.itemId.localeCompare(right.itemId);
      }),
  );
}

function groupsForCategory(category: WardrobeCategory, coverage: readonly FunctionalCoverage[]) {
  return coverage.filter(
    (group) => group.status === "gap" && group.categories.includes(category),
  );
}

function duplicationRisk(
  sameCategoryOwnedCount: number,
  sameCategoryColourOwnedCount: number,
  exactSignalOwnedCount: number,
  contributesToCoverageGap: boolean,
): DuplicationRisk {
  if (contributesToCoverageGap && sameCategoryOwnedCount === 0) {
    return "low";
  }
  if (exactSignalOwnedCount > 0 || sameCategoryColourOwnedCount >= 2) {
    return "high";
  }
  if (sameCategoryColourOwnedCount > 0 || sameCategoryOwnedCount >= 3) {
    return "medium";
  }
  return "low";
}

function wishListImpact(
  wishList: readonly WardrobeItem[],
  owned: readonly WardrobeItem[],
  coverage: readonly FunctionalCoverage[],
): readonly WishListImpact[] {
  return Object.freeze(
    wishList
      .map((item) => {
        const sameCategory = owned.filter((ownedItem) => ownedItem.category === item.category);
        const sameColour = sameCategory.filter(
          (ownedItem) => normalize(ownedItem.primaryColor) === normalize(item.primaryColor),
        );
        const exact = sameColour.filter(
          (ownedItem) => normalize(ownedItem.brand) === normalize(item.brand),
        );
        const gapGroups = groupsForCategory(item.category, coverage);
        const contributesToCoverageGap = gapGroups.length > 0;
        const risk = duplicationRisk(
          sameCategory.length,
          sameColour.length,
          exact.length,
          contributesToCoverageGap,
        );
        const contribution = contributesToCoverageGap
          ? `It contributes to the currently empty ${gapGroups.map((group) => group.label).join(" and ")} group.`
          : "It does not fill a currently empty broad functional group.";
        return Object.freeze({
          itemId: item.id,
          sameCategoryOwnedCount: sameCategory.length,
          sameCategoryColourOwnedCount: sameColour.length,
          exactSignalOwnedCount: exact.length,
          contributesToCoverageGap,
          coverageGroupLabels: Object.freeze(gapGroups.map((group) => group.label)),
          duplicationRisk: risk,
          explanation: `${sameCategory.length} owned item(s) share the category; ${sameColour.length} also share the primary colour; ${exact.length} share category, colour, and recorded brand. ${contribution}`,
        });
      })
      .sort((left, right) => {
        const rank: Record<DuplicationRisk, number> = { high: 0, medium: 1, low: 2 };
        return rank[left.duplicationRisk] - rank[right.duplicationRisk] || left.itemId.localeCompare(right.itemId);
      }),
  );
}

export function calculateWardrobeInsights(
  wardrobe: readonly WardrobeItem[],
  history: readonly OutfitWearHistory[],
): WardrobeInsights {
  const owned = wardrobe.filter((item) => item.ownershipStatus === "owned");
  const wishList = wardrobe.filter((item) => item.ownershipStatus === "wish-list");
  const archived = wardrobe.filter((item) => item.ownershipStatus === "archived");
  const coverage = functionalCoverage(owned);
  const totalWearEvents = history.reduce((total, entry) => total + entry.events.length, 0);

  return Object.freeze({
    ownership: Object.freeze({
      owned: owned.length,
      wishList: wishList.length,
      archived: archived.length,
    }),
    categories: Object.freeze(
      wardrobeCategories.map((category) =>
        Object.freeze({
          category,
          ownedCount: owned.filter((item) => item.category === category).length,
        }),
      ),
    ),
    functionalCoverage: coverage,
    duplicateClusters: duplicateClusters(owned),
    itemUsage: itemUsage(owned, history),
    wishListImpact: wishListImpact(wishList, owned, coverage),
    totalOutfits: history.length,
    totalWearEvents,
    methodology: Object.freeze([
      "Wear is attributed from explicit outfit wear events to the outfit's current saved item membership.",
      "Editing an outfit can therefore change how earlier wear events are attributed; historical item snapshots are not yet stored.",
      "Duplicate signals use only category, primary colour, and recorded brand. Names, notes, images, and external catalogues are excluded.",
      "Cost-per-wear uses only user-provided acquisition cost and explicit attributed wear. Currencies are never converted or combined.",
      "Coverage gaps are broad factual groups, not instructions to purchase.",
    ]),
  });
}
