import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, assertProductionAuthenticationConfigured } from "@/lib/auth/auth";
import { getDevelopmentCurrentUserId } from "@/lib/auth/development-current-user";

export async function getCurrentUserId(): Promise<string> {
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

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  return session.user.id;
}
