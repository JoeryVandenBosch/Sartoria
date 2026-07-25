import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { resetStyleProfile } from "@/modules/profile/application/reset-style-profile";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  expectedRevision: z.number().int().min(0),
});

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const parsed = resetSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile revision." }, { status: 400 });
  }

  try {
    const ownerId = await getCurrentUserId();
    const deleted = await resetStyleProfile(
      { ownerId, expectedRevision: parsed.data.expectedRevision },
      getStyleProfileRepository(),
    );

    return deleted
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "No style profile exists." }, { status: 404 });
  } catch (error) {
    if ((error as { name?: string }).name === "StyleProfileRevisionConflictError") {
      return NextResponse.json(
        { error: "This profile changed in another session. Reload before resetting it." },
        { status: 409 },
      );
    }

    throw error;
  }
}
