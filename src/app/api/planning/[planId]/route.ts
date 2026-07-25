import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { deleteOwnerTravelPlan } from "@/modules/planning/application/delete-travel-plan";
import { TravelPlanRevisionConflictError } from "@/modules/planning/application/travel-plan-repository";
import { getTravelPlanRepository } from "@/modules/planning/infrastructure/travel-plan-repository";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{
  params: Promise<{ planId: string }>;
}>;

const deleteSchema = z.object({ expectedRevision: z.coerce.number().int().positive() }).strict();

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const { planId } = await context.params;
  const parsed = deleteSchema.safeParse((await request.json()) as unknown);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid plan revision is required." }, { status: 400 });
  }

  try {
    const ownerId = await getCurrentUserId();
    const deleted = await deleteOwnerTravelPlan(
      { planId, ownerId, expectedRevision: parsed.data.expectedRevision },
      getTravelPlanRepository(),
    );
    return deleted
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "Travel plan not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof TravelPlanRevisionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
