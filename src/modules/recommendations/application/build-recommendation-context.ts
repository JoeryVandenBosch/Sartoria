import type {
  RecommendationContextOutfit,
  RecommendationGatewayInput,
} from "@/modules/recommendations/application/recommendation-gateway";
import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { StyleProfileRepository } from "@/modules/profile/application/style-profile-repository";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export async function buildRecommendationContext(
  input: Readonly<{
    ownerId: string;
    occasion: string;
    notes: string | null;
  }>,
  dependencies: Readonly<{
    wardrobeRepository: WardrobeItemRepository;
    profileRepository: StyleProfileRepository;
    outfitRepository: OutfitRepository;
    wearEventRepository: OutfitWearEventRepository;
  }>,
): Promise<RecommendationGatewayInput> {
  const [wardrobeItems, profile, outfits] = await Promise.all([
    dependencies.wardrobeRepository.listByOwner(input.ownerId),
    dependencies.profileRepository.findByOwner(input.ownerId),
    dependencies.outfitRepository.listByOwner(input.ownerId),
  ]);

  const availableWardrobe = wardrobeItems
    .filter((item) => item.ownershipStatus === "owned")
    .map((item) =>
      Object.freeze({
        id: item.id,
        category: item.category,
        name: item.name,
        brand: item.brand,
        primaryColor: item.primaryColor,
      }),
    );

  const savedOutfits: RecommendationContextOutfit[] = await Promise.all(
    outfits.slice(0, 20).map(async (outfit) => {
      const wearEvents = await dependencies.wearEventRepository.listByOutfitForOwner(
        outfit.id,
        input.ownerId,
      );
      const sortedDates = wearEvents.map((event) => event.wornOn).sort().reverse();
      return Object.freeze({
        id: outfit.id,
        name: outfit.name,
        occasion: outfit.occasion,
        wardrobeItemIds: Object.freeze([...outfit.wardrobeItemIds]),
        wearCount: wearEvents.length,
        lastWornOn: sortedDates[0] ?? null,
      });
    }),
  );

  return Object.freeze({
    schemaVersion: "1",
    request: Object.freeze({ occasion: input.occasion, notes: input.notes }),
    wardrobe: Object.freeze(availableWardrobe),
    profile: profile
      ? Object.freeze({
          fitPreference: profile.fitPreference,
          climateProfile: profile.climateProfile,
          recommendationMode: profile.recommendationMode,
          styleDirections: Object.freeze([...profile.styleDirections]),
          preferredColours: Object.freeze([...profile.preferredColours]),
          avoidedColours: Object.freeze([...profile.avoidedColours]),
          preferredBrands: Object.freeze([...profile.preferredBrands]),
          avoidedBrands: Object.freeze([...profile.avoidedBrands]),
          excludedMaterials: Object.freeze([...profile.excludedMaterials]),
          measurements: profile.useMeasurementsForRecommendations
            ? Object.freeze({ ...profile.measurements })
            : null,
        })
      : null,
    savedOutfits: Object.freeze(savedOutfits),
  });
}
