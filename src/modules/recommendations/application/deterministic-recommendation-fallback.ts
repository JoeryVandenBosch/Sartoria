import type {
  RecommendationGatewayInput,
  ValidatedProviderRecommendation,
} from "@/modules/recommendations/application/recommendation-gateway";

const categoryOrder = [
  "tailoring",
  "outerwear",
  "shirts",
  "tops",
  "knitwear",
  "trousers",
  "denim",
  "dresses",
  "skirts",
  "footwear",
  "accessories",
  "activewear",
  "other",
] as const;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function preferenceScore(
  item: RecommendationGatewayInput["wardrobe"][number],
  context: RecommendationGatewayInput,
): number {
  if (!context.profile) {
    return 0;
  }

  let score = 0;
  const color = normalized(item.primaryColor);
  const brand = item.brand ? normalized(item.brand) : null;
  if (context.profile.preferredColours.some((value) => normalized(value) === color)) {
    score += 4;
  }
  if (brand && context.profile.preferredBrands.some((value) => normalized(value) === brand)) {
    score += 3;
  }
  if (context.profile.avoidedColours.some((value) => normalized(value) === color)) {
    score -= 20;
  }
  if (brand && context.profile.avoidedBrands.some((value) => normalized(value) === brand)) {
    score -= 20;
  }
  return score;
}

function contextExclusions(context: RecommendationGatewayInput): readonly string[] {
  if (!context.profile) {
    return Object.freeze([]);
  }

  const exclusions = [
    ...context.profile.avoidedColours.map((value) => `Avoid colour: ${value}`),
    ...context.profile.avoidedBrands.map((value) => `Avoid brand: ${value}`),
    ...context.profile.excludedMaterials.map((value) => `Avoid material: ${value}`),
  ].slice(0, 8);

  return Object.freeze(exclusions);
}

function matchingSavedOutfit(context: RecommendationGatewayInput) {
  const wardrobeIds = new Set(context.wardrobe.map((item) => item.id));
  const occasion = normalized(context.request.occasion);

  return context.savedOutfits
    .filter(
      (outfit) =>
        outfit.wardrobeItemIds.length >= 2 &&
        outfit.wardrobeItemIds.every((itemId) => wardrobeIds.has(itemId)),
    )
    .sort((left, right) => {
      const leftMatches = left.occasion && normalized(left.occasion).includes(occasion) ? 1 : 0;
      const rightMatches = right.occasion && normalized(right.occasion).includes(occasion) ? 1 : 0;
      if (leftMatches !== rightMatches) {
        return rightMatches - leftMatches;
      }
      if (left.wearCount !== right.wearCount) {
        return right.wearCount - left.wearCount;
      }
      return left.name.localeCompare(right.name);
    })[0];
}

export function createDeterministicRecommendation(
  context: RecommendationGatewayInput,
): ValidatedProviderRecommendation {
  if (context.wardrobe.length < 2) {
    throw new Error("Add at least two owned wardrobe items before requesting a recommendation.");
  }

  const savedOutfit = matchingSavedOutfit(context);
  if (savedOutfit) {
    const items = new Map(context.wardrobe.map((item) => [item.id, item]));
    return Object.freeze({
      itemReasons: Object.freeze(
        savedOutfit.wardrobeItemIds.map((itemId) => {
          const item = items.get(itemId);
          if (!item) {
            throw new Error("Saved outfit contained an unavailable wardrobe item.");
          }
          return Object.freeze({
            itemId,
            reason: `${item.name} is part of your saved outfit “${savedOutfit.name}”.`,
          });
        }),
      ),
      summary: `Revisit your saved outfit “${savedOutfit.name}” for ${context.request.occasion}. It is grounded entirely in items you already own.`,
      exclusions: contextExclusions(context),
      confidence: savedOutfit.occasion ? "high" : "medium",
    });
  }

  const sorted = [...context.wardrobe].sort((left, right) => {
    const scoreDifference = preferenceScore(right, context) - preferenceScore(left, context);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }
    const categoryDifference =
      categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
    if (categoryDifference !== 0) {
      return categoryDifference;
    }
    return left.name.localeCompare(right.name);
  });

  const chosen: typeof sorted = [];
  const usedCategories = new Set<string>();
  for (const item of sorted) {
    if (!usedCategories.has(item.category)) {
      chosen.push(item);
      usedCategories.add(item.category);
    }
    if (chosen.length === 4) {
      break;
    }
  }
  for (const item of sorted) {
    if (chosen.length >= 3) {
      break;
    }
    if (!chosen.some((chosenItem) => chosenItem.id === item.id)) {
      chosen.push(item);
    }
  }

  return Object.freeze({
    itemReasons: Object.freeze(
      chosen.map((item) =>
        Object.freeze({
          itemId: item.id,
          reason: `${item.name} adds ${item.primaryColor.toLocaleLowerCase("en")} ${item.category} from your owned wardrobe.`,
        }),
      ),
    ),
    summary: `A restrained wardrobe-first combination for ${context.request.occasion}, selected deterministically from available items and your recorded preferences.`,
    exclusions: contextExclusions(context),
    confidence: context.profile ? "medium" : "low",
  });
}
