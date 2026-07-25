import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { completeWardrobeMediaUpload } from "@/modules/media/application/complete-wardrobe-media-upload";
import {
  getMediaObjectStore,
  getMediaProcessingDispatcher,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ mediaId: string }>;
}>;

export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { mediaId } = await context.params;
  const ownerId = await getCurrentUserId();

  try {
    const media = await completeWardrobeMediaUpload(
      { mediaId, ownerId },
      {
        mediaRepository: getWardrobeMediaRepository(),
        objectStore: getMediaObjectStore(),
        now: () => new Date(),
      },
    );

    if (media.status === "uploaded") {
      await getMediaProcessingDispatcher().dispatch({ mediaId: media.id, ownerId });
    }

    return NextResponse.json(
      {
        mediaId: media.id,
        status: media.status,
        rejectionCode: media.rejectionCode,
      },
      { status: media.status === "uploaded" ? 202 : 422 },
    );
  } catch (error) {
    if ((error as { name?: string }).name === "WardrobeMediaNotFoundError") {
      return NextResponse.json({ error: "Media record not found." }, { status: 404 });
    }

    throw error;
  }
}
