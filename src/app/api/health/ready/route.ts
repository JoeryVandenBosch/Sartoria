import { NextResponse } from "next/server";

import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
import { generateCorrelationId } from "@/lib/observability/correlation-id";
import { getOperationalEventEmitter } from "@/lib/observability/operational-event-runtime";
import type { FailureClassification } from "@/lib/observability/operational-event";

export const dynamic = "force-dynamic";

/**
 * Classifies a readiness failure into a bounded category.
 *
 * Only the error's constructor name is inspected. The message is never read,
 * so a driver that embeds a connection string or credential in its text cannot
 * leak it into an event.
 */
function classifyReadinessFailure(error: unknown): FailureClassification {
  const name = (error as { name?: unknown })?.name;

  if (name === "DatabaseConfigurationError") {
    return "configuration";
  }

  if (name === "TimeoutError") {
    return "timeout";
  }

  return "dependency-unavailable";
}

export async function GET(): Promise<NextResponse> {
  const emitter = getOperationalEventEmitter();
  const correlationId = generateCorrelationId();
  const startedAt = Date.now();

  // The probe runs first and records only a bounded classification. Emission
  // happens afterwards, outside any try whose catch changes the response: with
  // the emit inside the success path's try, a telemetry fault would have been
  // caught below and turned a healthy 200 into a 503, which removes the
  // container from service under the Dockerfile's HEALTHCHECK.
  let failureClassification: FailureClassification | null = null;

  try {
    assertDatabaseConfigured();
    await getPostgresPool().query("SELECT 1");
  } catch (error) {
    failureClassification = classifyReadinessFailure(error);
  }

  const durationMs = Date.now() - startedAt;

  if (failureClassification === null) {
    emitter.emit({
      name: "database.readiness.checked",
      severity: "info",
      outcome: "success",
      correlationId,
      durationMs,
    });

    return NextResponse.json(
      { status: "ready" },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  }

  emitter.emit({
    name: "database.readiness.checked",
    severity: "error",
    outcome: "failure",
    correlationId,
    durationMs,
    attributes: { failureClassification },
  });

  return NextResponse.json(
    { status: "not-ready" },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
