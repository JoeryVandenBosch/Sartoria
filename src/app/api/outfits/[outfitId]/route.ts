import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { deleteOwnerOutfitWithHistory } from "@/modules/outfits/application/delete-outfit-with-history";
import { OutfitRevisionConflictError } from "@/modules/outfits/application/outfit-repository";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ outfitId: string }>;
}>;

const deletionSchema = z.object({
  expectedRevision: z.number().int().min(1),
});

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const { outfitId } = await context.params;
  const parsed = deletionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outfit deletion request." }, { status: 400 });
  }

  try {
    const ownerId = await getCurrentUserId();
    const deleted = await deleteOwnerOutfitWithHistory(
      {
        outfitId,
        ownerId,
        expectedRevision: parsed.data.expectedRevision,
      },
      {
        outfitRepository: getOutfitRepository(),
        wearEventRepository: getOutfitWearEventRepository(),
      },
    );

    return deleted
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "Outfit not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof OutfitRevisionConflictError) {
      return NextResponse.json(
        { error: "The outfit changed in another session." },
        { status: 409 },
      );
    }
    throw error;
  }
}
