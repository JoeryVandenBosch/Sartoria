import type { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import {
  assertAuthenticationRuntimeConfigured,
  auth,
} from "@/lib/auth/auth";
import { enforceClientRateLimit } from "@/lib/rate-limiting/enforce-rate-limit";

const handlers = toNextJsHandler(auth);

export async function GET(request: NextRequest): Promise<Response> {
  assertAuthenticationRuntimeConfigured();
  return handlers.GET(request);
}

/**
 * Only POST is limited. Authentication attempts are POSTs; GET carries session
 * and metadata reads that a signed-in person makes routinely, and limiting
 * those would degrade normal use without raising the cost of guessing.
 *
 * Deliberately no account lockout: locking an account after failed attempts
 * lets anyone who knows an email address deny that person access to their own
 * wardrobe, which is a worse outcome than slow guessing.
 */
export async function POST(request: NextRequest): Promise<Response> {
  assertAuthenticationRuntimeConfigured();

  const limit = await enforceClientRateLimit("auth.attempt", request);
  if (limit.refusal) {
    return limit.refusal;
  }

  return handlers.POST(request);
}
