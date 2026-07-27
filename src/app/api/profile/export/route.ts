import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { enforceOwnerRateLimit } from "@/lib/rate-limiting/enforce-rate-limit";
import { getStyleProfileForOwner } from "@/modules/profile/application/query-style-profile";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const ownerId = await getCurrentUserId();

  const limit = await enforceOwnerRateLimit("profile.export", ownerId);
  if (limit.refusal) {
    return limit.refusal;
  }

  const profile = await getStyleProfileForOwner(ownerId, getStyleProfileRepository());

  if (!profile) {
    return NextResponse.json(
      { error: "No style profile exists to export." },
      {
        status: 404,
        headers: {
          "cache-control": "private, no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      schemaVersion: "1.0",
      profile,
    },
    {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": 'attachment; filename="sartoria-style-profile.json"',
        "x-content-type-options": "nosniff",
      },
    },
  );
}
