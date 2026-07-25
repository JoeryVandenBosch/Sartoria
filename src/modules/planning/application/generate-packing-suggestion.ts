import type { StyleProfile } from "@/modules/profile/domain/style-profile";
import {
  travelDurationDays,
  type TravelActivityContext,
  type TravelClimateExpectation,
  type TravelLaundryAccess,
} from "@/modules/planning/domain/travel-plan";
import type { WardrobeCategory, WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

export type PackingTarget = Readonly<{
  label: string;
  categories: readonly WardrobeCategory[];
  target: number;
}>;

export type PackingSuggestionItem = Readonly<{
  itemId: string;
  reason: string;
}>;

export type PackingSuggestion = Readonly<{
  durationDays: number;
  targets: readonly PackingTarget[];
  items: readonly PackingSuggestionItem[];
  warnings: readonly string[];
}>;

export type PackingSuggestionInput = Readonly<{
  startDate: string;
  endDate: string;
  climate: TravelClimateExpectation;
  activities: readonly TravelActivityContext[];
  laundryAccess: TravelLaundryAccess;
}>;

function effectiveDays(days: number, laundry: TravelLaundryAccess): number {
  if (laundry === "regular") {
    return Math.max(2, Math.ceil(days / 3));
  }
  if (laundry === "limited") {
    return Math.max(2, Math.ceil(days / 2));
  }
  return days;
}

function hasActivity(
  activities: readonly TravelActivityContext[],
  ...values: readonly TravelActivityContext[]
): boolean {
  return values.some((value) => activities.includes(value));
}

export function createPackingTargets(input: PackingSuggestionInput): readonly PackingTarget[] {
  const days = travelDurationDays(input.startDate, input.endDate);
  const rotationDays = effectiveDays(days, input.laundryAccess);
  const targets: PackingTarget[] = [
    {
      label: "Daily upper layers",
      categories: ["shirts", "tops"],
      target: Math.min(8, Math.max(2, rotationDays)),
    },
    {
      label: "Daily lower layers",
      categories: ["trousers", "denim", "skirts", "dresses"],
      target: Math.min(5, Math.max(1, Math.ceil(rotationDays / 2))),
    },
    {
      label: "Footwear",
      categories: ["footwear"],
      target: hasActivity(input.activities, "business", "dinner", "formal", "active", "beach")
        ? Math.min(3, days >= 5 ? 3 : 2)
        : 1,
    },
  ];

  if (["cold", "cool", "mild", "mixed"].includes(input.climate)) {
    targets.push({
      label: "Knitwear",
      categories: ["knitwear"],
      target: input.climate === "cold" ? 2 : 1,
    });
  }

  if (["cold", "cool", "mixed"].includes(input.climate)) {
    targets.push({ label: "Outerwear", categories: ["outerwear"], target: 1 });
  }

  if (hasActivity(input.activities, "business", "dinner", "formal")) {
    targets.push({ label: "Tailoring", categories: ["tailoring"], target: 1 });
  }

  if (hasActivity(input.activities, "active")) {
    targets.push({
      label: "Activewear",
      categories: ["activewear"],
      target: Math.min(3, Math.max(1, Math.ceil(rotationDays / 2))),
    });
  }

  if (hasActivity(input.activities, "beach")) {
    targets.push({
      label: "Warm-weather options",
      categories: ["tops", "dresses", "skirts", "accessories"],
      target: Math.min(3, Math.max(1, Math.ceil(rotationDays / 3))),
    });
  }

  targets.push({ label: "Accessories", categories: ["accessories"], target: 1 });
  return Object.freeze(targets.map((target) => Object.freeze(target)));
}

function identity(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function preferenceScore(item: WardrobeItem, profile: StyleProfile | null): number {
  if (!profile) {
    return 0;
  }

  let score = 0;
  const colour = identity(item.primaryColor);
  const brand = item.brand ? identity(item.brand) : null;
  if (profile.preferredColours.some((value) => identity(value) === colour)) {
    score += 4;
  }
  if (profile.avoidedColours.some((value) => identity(value) === colour)) {
    score -= 20;
  }
  if (brand && profile.preferredBrands.some((value) => identity(value) === brand)) {
    score += 3;
  }
  if (brand && profile.avoidedBrands.some((value) => identity(value) === brand)) {
    score -= 20;
  }
  return score;
}

function sortedCandidates(
  wardrobe: readonly WardrobeItem[],
  categories: readonly WardrobeCategory[],
  profile: StyleProfile | null,
): WardrobeItem[] {
  return wardrobe
    .filter((item) => item.ownershipStatus === "owned" && categories.includes(item.category))
    .sort((left, right) => {
      const score = preferenceScore(right, profile) - preferenceScore(left, profile);
      if (score !== 0) {
        return score;
      }
      const category = categories.indexOf(left.category) - categories.indexOf(right.category);
      if (category !== 0) {
        return category;
      }
      const name = left.name.localeCompare(right.name);
      return name !== 0 ? name : left.id.localeCompare(right.id);
    });
}

export function generatePackingSuggestion(
  input: PackingSuggestionInput,
  wardrobe: readonly WardrobeItem[],
  profile: StyleProfile | null,
): PackingSuggestion {
  const available = wardrobe.filter((item) => item.ownershipStatus === "owned");
  if (available.length < 2) {
    throw new Error("Add at least two owned wardrobe items before creating a packing plan.");
  }

  const targets = createPackingTargets(input);
  const chosen = new Map<string, PackingSuggestionItem>();
  const warnings: string[] = [];

  for (const target of targets) {
    const candidates = sortedCandidates(available, target.categories, profile).filter(
      (item) => !chosen.has(item.id),
    );
    const selected = candidates.slice(0, target.target);

    for (const item of selected) {
      chosen.set(
        item.id,
        Object.freeze({
          itemId: item.id,
          reason: `${item.name} covers ${target.label.toLocaleLowerCase("en")} for this ${travelDurationDays(
            input.startDate,
            input.endDate,
          )}-day plan.`,
        }),
      );
    }

    if (selected.length < target.target) {
      warnings.push(
        `${target.label}: ${selected.length} of ${target.target} target items are available in the owned wardrobe.`,
      );
    }
  }

  if (chosen.size < 2) {
    for (const item of available
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
      .slice(0, 2)) {
      chosen.set(
        item.id,
        Object.freeze({
          itemId: item.id,
          reason: `${item.name} is included as available owned wardrobe coverage.`,
        }),
      );
    }
  }

  return Object.freeze({
    durationDays: travelDurationDays(input.startDate, input.endDate),
    targets,
    items: Object.freeze([...chosen.values()].slice(0, 40)),
    warnings: Object.freeze(warnings.slice(0, 12)),
  });
}
