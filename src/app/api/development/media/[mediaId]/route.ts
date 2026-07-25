import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getDevelopmentMediaObject } from "@/modules/media/infrastructure/development-media-object-store";
import { getWardrobeMediaRepository } from "@/modules/media/infrastructure/media-services";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ mediaId: string }>;
}>;

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { mediaId } = await context.params;
  const ownerId = await getCurrentUserId();
  const media = await getWardrobeMediaRepository().findByIdForOwner(mediaId, ownerId);

  if (!media || media.status !== "ready" || !media.privateKey || !media.detectedContentType) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const object = getDevelopmentMediaObject(media.privateKey);
  if (!object) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  return new NextResponse(object.bytes, {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": "inline",
      "content-length": object.bytes.byteLength.toString(),
      "content-type": media.detectedContentType,
      "x-content-type-options": "nosniff",
    },
  });
}
