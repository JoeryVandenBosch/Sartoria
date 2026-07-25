import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { createOwnerTravelPlan } from "@/modules/planning/application/create-travel-plan";
import { getTravelPlanRepository } from "@/modules/planning/infrastructure/travel-plan-repository";
import { travelPlanCreateSchema } from "@/modules/planning/transport/travel-plan-schema";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as unknown;
  const parsed = travelPlanCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Review the travel plan and packing selection.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const ownerId = await getCurrentUserId();
    const plan = await createOwnerTravelPlan(
      {
        ownerId,
        plan: {
          ...parsed.data,
          destination: parsed.data.destination,
          notes: parsed.data.notes,
        },
      },
      {
        travelPlanRepository: getTravelPlanRepository(),
        wardrobeRepository: getWardrobeRepository(),
        createId: randomUUID,
        now: () => new Date(),
      },
    );
    return NextResponse.json(
      { planId: plan.id },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const name = (error as { name?: string }).name;
    const status = name === "TravelPlanWardrobeSelectionError" ? 404 : 422;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sartoria could not save the travel plan." },
      { status },
    );
  }
}
