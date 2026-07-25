import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { initiateWardrobeMediaUpload } from "@/modules/media/application/initiate-wardrobe-media-upload";
import {
  getMediaObjectStore,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";
import { mediaUploadInitiationSchema } from "@/modules/media/transport/media-upload-schema";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = mediaUploadInitiationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Review the selected media file.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const ownerId = await getCurrentUserId();

  try {
    const result = await initiateWardrobeMediaUpload(
      {
        ownerId,
        wardrobeItemId: parsed.data.wardrobeItemId,
        originalFilename: parsed.data.originalFilename,
        declaredContentType: parsed.data.declaredContentType,
      },
      {
        wardrobeRepository: getWardrobeRepository(),
        mediaRepository: getWardrobeMediaRepository(),
        objectStore: getMediaObjectStore(),
        createId: randomUUID,
        now: () => new Date(),
      },
    );

    return NextResponse.json(
      {
        mediaId: result.media.id,
        policy: result.policy,
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { name?: string }).name === "WardrobeMediaAuthorizationError") {
      return NextResponse.json({ error: "Wardrobe item not found." }, { status: 404 });
    }

    throw error;
  }
}
