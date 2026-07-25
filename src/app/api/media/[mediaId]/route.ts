import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { deleteWardrobeMediaForOwner } from "@/modules/media/application/delete-wardrobe-media";
import {
  getMediaObjectStore,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ mediaId: string }>;
}>;

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { mediaId } = await context.params;
  const ownerId = await getCurrentUserId();
  const media = await deleteWardrobeMediaForOwner(
    { mediaId, ownerId },
    {
      mediaRepository: getWardrobeMediaRepository(),
      objectStore: getMediaObjectStore(),
      now: () => new Date(),
    },
  );

  if (!media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
