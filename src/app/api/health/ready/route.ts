import { NextResponse } from "next/server";

import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";
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
  const startedAt = Date.now();

  try {
    assertDatabaseConfigured();
    await getPostgresPool().query("SELECT 1");

    emitter.emit({
      name: "database.readiness.checked",
      severity: "info",
      outcome: "success",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { status: "ready" },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    emitter.emit({
      name: "database.readiness.checked",
      severity: "error",
      outcome: "failure",
      durationMs: Date.now() - startedAt,
      attributes: { failureClassification: classifyReadinessFailure(error) },
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
}
