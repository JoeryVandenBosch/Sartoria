import { NextResponse } from "next/server";

import { assertDatabaseConfigured, getPostgresPool } from "@/lib/database/postgres-pool";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    assertDatabaseConfigured();
    await getPostgresPool().query("SELECT 1");

    return NextResponse.json(
      { status: "ready" },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch {
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
