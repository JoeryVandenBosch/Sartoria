import { NextResponse, type NextRequest } from "next/server";

import { enforceClientRateLimit } from "@/lib/rate-limiting/enforce-rate-limit";
import { verifyBearerToken } from "@/lib/security/internal-token";
import { processWardrobeMedia } from "@/modules/media/application/process-wardrobe-media";
import {
  getMediaObjectStore,
  getMediaScanner,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";
import { mediaProcessingMessageSchema } from "@/modules/media/transport/media-processing-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Applied before token verification so a caller guessing tokens is bounded
  // by the same limit as any other caller.
  const limit = await enforceClientRateLimit("internal.endpoint", request);
  if (limit.refusal) {
    return limit.refusal;
  }

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
