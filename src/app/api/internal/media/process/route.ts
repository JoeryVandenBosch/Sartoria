import { NextResponse, type NextRequest } from "next/server";

import { verifyBearerToken } from "@/lib/security/internal-token";
import { generateCorrelationId } from "@/lib/observability/correlation-id";
import { getOperationalEventEmitter } from "@/lib/observability/operational-event-runtime";
import { processWardrobeMedia } from "@/modules/media/application/process-wardrobe-media";
import {
  getMediaObjectStore,
  getMediaScanner,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";
import { mediaProcessingMessageSchema } from "@/modules/media/transport/media-processing-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyBearerToken(request.headers.get("authorization"), process.env.MEDIA_WORKER_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = mediaProcessingMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media processing message." }, { status: 400 });
  }

  const media = await processWardrobeMedia(parsed.data, {
    mediaRepository: getWardrobeMediaRepository(),
    objectStore: getMediaObjectStore(),
    scanner: getMediaScanner(),
    now: () => new Date(),
    emitter: getOperationalEventEmitter(),
    correlationId: generateCorrelationId(),
  });

  return NextResponse.json(
    media
      ? {
          mediaId: media.id,
          status: media.status,
        }
      : {
          mediaId: parsed.data.mediaId,
          status: "ignored",
        },
  );
}
