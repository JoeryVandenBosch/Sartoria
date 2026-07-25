import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { generatePackingSuggestion } from "@/modules/planning/application/generate-packing-suggestion";
import { travelPlanPreviewSchema } from "@/modules/planning/transport/travel-plan-schema";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as unknown;
  const parsed = travelPlanPreviewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Review the travel dates and packing controls.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const ownerId = await getCurrentUserId();
    const [wardrobe, profile] = await Promise.all([
      getWardrobeRepository().listByOwner(ownerId),
      getStyleProfileRepository().findByOwner(ownerId),
    ]);
    const suggestion = generatePackingSuggestion(parsed.data, wardrobe, profile);
    const availableItems = wardrobe
      .filter((item) => item.ownershipStatus === "owned")
      .map((item) => ({
        id: item.id,
        category: item.category,
        name: item.name,
        brand: item.brand,
        primaryColor: item.primaryColor,
      }));

    return NextResponse.json(
      { suggestion, availableItems },
      { status: 200, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sartoria could not build the packing preview." },
      { status: 422 },
    );
  }
}
