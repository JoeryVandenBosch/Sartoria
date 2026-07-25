import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { maximumWardrobeMediaBytes } from "@/modules/media/domain/wardrobe-media";
import {
  getDevelopmentMediaServices,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";
import { storeDevelopmentUpload } from "@/modules/media/infrastructure/development-media-object-store";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ mediaId: string }>;
}>;

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { mediaId } = await context.params;
  const ownerId = await getCurrentUserId();
  const media = await getWardrobeMediaRepository().findByIdForOwner(mediaId, ownerId);

  if (!media || media.status !== "initiated") {
    return NextResponse.json({ error: "Media record not found." }, { status: 404 });
  }

  getDevelopmentMediaServices();

  const formData = await request.formData();
  const file = formData.get("file");
  const key = formData.get("key");
  const contentType = formData.get("Content-Type");
  const suppliedMediaId = formData.get("x-sartoria-media-id");

  if (
    !(file instanceof File) ||
    key !== media.quarantineKey ||
    contentType !== media.declaredContentType ||
    suppliedMediaId !== media.id
  ) {
    return NextResponse.json({ error: "Upload policy fields do not match." }, { status: 400 });
  }

  if (file.size < 1 || file.size > maximumWardrobeMediaBytes || file.type !== media.declaredContentType) {
    return NextResponse.json({ error: "The selected media file is not allowed." }, { status: 400 });
  }

  storeDevelopmentUpload({
    key: media.quarantineKey,
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
    mediaId: media.id,
  });

  return new NextResponse(null, { status: 204 });
}
