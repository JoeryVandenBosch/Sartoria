import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, assertProductionAuthenticationConfigured } from "@/lib/auth/auth";
import { getDevelopmentCurrentUserId } from "@/lib/auth/development-current-user";

/**
 * Resolves the authenticated owner, or `null` when there is no valid session.
 *
 * Single resolution point for both transports (ADR 0013): a browser cookie for
 * the retained web interface and an `Authorization: Bearer` header for the
 * native client. Better Auth inspects both from the request headers, so no
 * transport-specific branching is needed here.
 */
export async function resolveCurrentUserId(): Promise<string | null> {
  const authenticationMode = process.env.SARTORIA_AUTH_MODE;
  const useDevelopmentIdentity =
    process.env.NODE_ENV !== "production" && authenticationMode !== "better-auth";

  if (useDevelopmentIdentity) {
    if (authenticationMode && authenticationMode !== "development") {
      throw new Error(`Unsupported SARTORIA_AUTH_MODE: ${authenticationMode}`);
    }

    return getDevelopmentCurrentUserId();
  }

  assertProductionAuthenticationConfigured();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

/**
 * For server-rendered pages: redirects to sign-in when unauthenticated.
 * `redirect` signals by throwing, so nothing after it runs.
 */
export async function getCurrentUserId(): Promise<string> {
  const ownerId = await resolveCurrentUserId();

  if (!ownerId) {
    redirect("/sign-in");
  }

  return ownerId;
}

/**
 * For API routes: an unauthenticated request must receive a 401, never an
 * HTML redirect a native client cannot follow. Callers check for `null`.
 */
export async function getApiUserId(): Promise<string | null> {
  return resolveCurrentUserId();
}
