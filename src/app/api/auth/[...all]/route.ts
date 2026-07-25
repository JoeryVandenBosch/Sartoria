import type { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import {
  assertAuthenticationRuntimeConfigured,
  auth,
} from "@/lib/auth/auth";

const handlers = toNextJsHandler(auth);

export async function GET(request: NextRequest): Promise<Response> {
  assertAuthenticationRuntimeConfigured();
  return handlers.GET(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  assertAuthenticationRuntimeConfigured();
  return handlers.POST(request);
}
