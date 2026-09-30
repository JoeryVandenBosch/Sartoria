import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/api/respond";
import { buildOwnerWardrobeInsights } from "@/modules/insights/application/build-owner-wardrobe-insights";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

/** GET /api/v1/insights — deterministic factual wardrobe insights. */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const insights = await buildOwnerWardrobeInsights(auth.ownerId, {
    wardrobeRepository: getWardrobeRepository(),
    outfitRepository: getOutfitRepository(),
    wearEventRepository: getOutfitWearEventRepository(),
  });

  return NextResponse.json({ insights }, { headers: { "cache-control": "no-store" } });
}
