import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { invalid, malformedJson, readJson, requireOwner } from "@/lib/api/respond";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";
import { generateWardrobeRecommendation } from "@/modules/recommendations/application/generate-wardrobe-recommendation";
import { listRecommendationsForOwner } from "@/modules/recommendations/application/query-recommendations";
import { RecommendationGatewayConfigurationError } from "@/modules/recommendations/infrastructure/http-recommendation-gateway";
import { getRecommendationGateway } from "@/modules/recommendations/infrastructure/recommendation-gateway";
import { getRecommendationRepository } from "@/modules/recommendations/infrastructure/recommendation-repository";
import { recommendationRequestSchema } from "@/modules/recommendations/transport/recommendation-request-schema";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

/**
 * Mirrors the server action: a misconfigured provider degrades to the
 * deterministic fallback rather than failing the request.
 */
function configuredGateway() {
  try {
    return getRecommendationGateway();
  } catch (error) {
    if (error instanceof RecommendationGatewayConfigurationError) return null;
    throw error;
  }
}

/** GET /api/v1/recommendations */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const recommendations = await listRecommendationsForOwner(
    auth.ownerId,
    getRecommendationRepository(),
  );

  return NextResponse.json({ recommendations }, { headers: { "cache-control": "no-store" } });
}

/** POST /api/v1/recommendations — request advice for an occasion. */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const body = await readJson(request);
  if (body === undefined) return malformedJson();

  const parsed = recommendationRequestSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);

  const recommendation = await generateWardrobeRecommendation(
    { ownerId: auth.ownerId, occasion: parsed.data.occasion, notes: parsed.data.notes },
    {
      wardrobeRepository: getWardrobeRepository(),
      profileRepository: getStyleProfileRepository(),
      outfitRepository: getOutfitRepository(),
      wearEventRepository: getOutfitWearEventRepository(),
      recommendationRepository: getRecommendationRepository(),
      gateway: configuredGateway(),
      createId: randomUUID,
      now: () => new Date(),
    },
  );

  return NextResponse.json({ recommendation }, { status: 201 });
}
