import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, assertProductionAuthenticationConfigured } from "@/lib/auth/auth";
import { getDevelopmentCurrentUserId } from "@/lib/auth/development-current-user";
import { generateCorrelationId } from "@/lib/observability/correlation-id";
import { getOperationalEventEmitter } from "@/lib/observability/operational-event-runtime";

export async function getCurrentUserId(): Promise<string> {
  const emitter = getOperationalEventEmitter();
  // Groups the events of one resolution. Cross-boundary propagation within a
  // single request needs request-scoped context and is not implemented.
  const correlationId = generateCorrelationId();
  const authenticationMode = process.env.SARTORIA_AUTH_MODE;
  const useDevelopmentIdentity =
    process.env.NODE_ENV !== "production" && authenticationMode !== "better-auth";

  if (useDevelopmentIdentity) {
    if (authenticationMode && authenticationMode !== "development") {
      emitter.emit({
        name: "auth.session.resolved",
        severity: "error",
        outcome: "failure",
        correlationId,
        attributes: {
          identitySource: "development",
          authenticated: false,
          failureClassification: "configuration",
        },
      });

      // The message names the configuration key only. The unsupported value is
      // deliberately not echoed into the event.
      throw new Error(`Unsupported SARTORIA_AUTH_MODE: ${authenticationMode}`);
    }

    emitter.emit({
      name: "auth.session.resolved",
      severity: "info",
      outcome: "success",
      correlationId,
      attributes: { identitySource: "development", authenticated: true },
    });

    return getDevelopmentCurrentUserId();
  }

  assertProductionAuthenticationConfigured();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    emitter.emit({
      name: "auth.session.resolved",
      severity: "info",
      outcome: "failure",
      correlationId,
      attributes: {
        identitySource: "better-auth",
        authenticated: false,
        failureClassification: "not-authorised",
      },
    });

    // Emitted before redirecting: redirect() signals through a thrown control
    // value, so anything after this line would not run.
    redirect("/sign-in");
  }

  emitter.emit({
    name: "auth.session.resolved",
    severity: "info",
    outcome: "success",
    correlationId,
    attributes: { identitySource: "better-auth", authenticated: true },
  });

  return session.user.id;
}
