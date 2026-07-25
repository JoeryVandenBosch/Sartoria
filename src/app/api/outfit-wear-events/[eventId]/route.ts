import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { deleteOwnerOutfitWearEvent } from "@/modules/outfits/application/delete-outfit-wear-event";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ eventId: string }>;
}>;

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { eventId } = await context.params;
  const ownerId = await getCurrentUserId();
  const deleted = await deleteOwnerOutfitWearEvent(
    { eventId, ownerId },
    getOutfitWearEventRepository(),
  );

  return deleted
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Wear event not found." }, { status: 404 });
}
