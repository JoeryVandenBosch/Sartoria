import type { RecommendationConfidence } from "@/modules/recommendations/domain/wardrobe-recommendation";
import type { WardrobeCategory } from "@/modules/wardrobe/domain/wardrobe-item";

export type RecommendationContextItem = Readonly<{
  id: string;
  category: WardrobeCategory;
  name: string;
  brand: string | null;
  primaryColor: string;
}>;

export type RecommendationContextProfile = Readonly<{
  fitPreference: string;
  climateProfile: string;
  recommendationMode: string;
  styleDirections: readonly string[];
  preferredColours: readonly string[];
  avoidedColours: readonly string[];
  preferredBrands: readonly string[];
  avoidedBrands: readonly string[];
  excludedMaterials: readonly string[];
  measurements: Readonly<Record<string, number | null>> | null;
}>;

export type RecommendationContextOutfit = Readonly<{
  id: string;
  name: string;
  occasion: string | null;
  wardrobeItemIds: readonly string[];
  wearCount: number;
  lastWornOn: string | null;
}>;

export type RecommendationGatewayInput = Readonly<{
  schemaVersion: "1";
  request: Readonly<{
    occasion: string;
    notes: string | null;
  }>;
  wardrobe: readonly RecommendationContextItem[];
  profile: RecommendationContextProfile | null;
  savedOutfits: readonly RecommendationContextOutfit[];
}>;

export type RecommendationProviderResult = Readonly<{
  output: unknown;
  provider: string;
  model: string | null;
}>;

export interface RecommendationGateway {
  generate(input: RecommendationGatewayInput): Promise<RecommendationProviderResult>;
}

export type ValidatedProviderRecommendation = Readonly<{
  itemReasons: readonly Readonly<{ itemId: string; reason: string }>[];
  summary: string;
  exclusions: readonly string[];
  confidence: RecommendationConfidence;
}>;
