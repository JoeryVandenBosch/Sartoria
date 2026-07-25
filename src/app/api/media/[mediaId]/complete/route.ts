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

function responseStatus(status: string): number {
  if (status === "ready") {
    return 200;
  }

  if (status === "uploaded" || status === "scanning" || status === "failed") {
    return 202;
  }

  return 422;
}

export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { mediaId } = await context.params;
  const ownerId = await getCurrentUserId();
  const mediaRepository = getWardrobeMediaRepository();

  try {
    const completed = await completeWardrobeMediaUpload(
      { mediaId, ownerId },
      {
        mediaRepository,
        objectStore: getMediaObjectStore(),
        now: () => new Date(),
      },
    );

    if (completed.status === "uploaded") {
      await getMediaProcessingDispatcher().dispatch({ mediaId: completed.id, ownerId });
    }

    const current =
      (await mediaRepository.findByIdForOwner(completed.id, ownerId)) ?? completed;

    return NextResponse.json(
      {
        mediaId: current.id,
        status: current.status,
        rejectionCode: current.rejectionCode,
      },
      { status: responseStatus(current.status) },
    );
  } catch (error) {
    if ((error as { name?: string }).name === "WardrobeMediaNotFoundError") {
      return NextResponse.json({ error: "Media record not found." }, { status: 404 });
    }

    throw error;
  }
}
