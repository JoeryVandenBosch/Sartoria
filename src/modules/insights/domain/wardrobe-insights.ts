import type { WardrobeCategory } from "@/modules/wardrobe/domain/wardrobe-item";

export type CoverageStatus = "covered" | "gap";
export type DuplicateSignalKind = "exact-signal" | "near-signal";
export type UnderuseStatus = "unavailable" | "not-recorded" | "light-use" | "used";
export type DuplicationRisk = "low" | "medium" | "high";

export type OwnershipSummary = Readonly<{
  owned: number;
  wishList: number;
  archived: number;
}>;

export type CategoryCoverage = Readonly<{
  category: WardrobeCategory;
  ownedCount: number;
}>;

export type FunctionalCoverage = Readonly<{
  id: string;
  label: string;
  categories: readonly WardrobeCategory[];
  ownedCount: number;
  status: CoverageStatus;
  sourceItemIds: readonly string[];
}>;

export type DuplicateCluster = Readonly<{
  kind: DuplicateSignalKind;
  category: WardrobeCategory;
  normalizedColour: string;
  normalizedBrand: string | null;
  itemIds: readonly string[];
  matchingFacts: readonly string[];
}>;

export type ItemUsageInsight = Readonly<{
  itemId: string;
  outfitMembershipCount: number;
  attributedWearCount: number;
  lastWornOn: string | null;
  underuseStatus: UnderuseStatus;
  costPerWearMinor: number | null;
  costCurrency: string | null;
}>;

export type WishListImpact = Readonly<{
  itemId: string;
  sameCategoryOwnedCount: number;
  sameCategoryColourOwnedCount: number;
  exactSignalOwnedCount: number;
  contributesToCoverageGap: boolean;
  coverageGroupLabels: readonly string[];
  duplicationRisk: DuplicationRisk;
  explanation: string;
}>;

export type WardrobeInsights = Readonly<{
  ownership: OwnershipSummary;
  categories: readonly CategoryCoverage[];
  functionalCoverage: readonly FunctionalCoverage[];
  duplicateClusters: readonly DuplicateCluster[];
  itemUsage: readonly ItemUsageInsight[];
  wishListImpact: readonly WishListImpact[];
  totalOutfits: number;
  totalWearEvents: number;
  methodology: readonly string[];
}>;
