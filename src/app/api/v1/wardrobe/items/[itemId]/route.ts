import { NextResponse } from "next/server";

import { invalid, malformedJson, notFound, readJson, requireOwner } from "@/lib/api/respond";
import { reviseWardrobeItemForOwner } from "@/modules/wardrobe/application/revise-wardrobe-item";
import { WardrobeItemValidationError } from "@/modules/wardrobe/domain/wardrobe-item";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";
import {
  wardrobeItemFormSchema,
  wardrobeItemRevisionFrom,
} from "@/modules/wardrobe/transport/wardrobe-item-schema";

export const dynamic = "force-dynamic";

type RouteContext = Readonly<{ params: Promise<{ itemId: string }> }>;

/** GET /api/v1/wardrobe/items/:itemId */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const { itemId } = await context.params;
  const item = await getWardrobeRepository().findByIdForOwner(itemId, auth.ownerId);

  return item
    ? NextResponse.json({ item }, { headers: { "cache-control": "no-store" } })
    : notFound();
}

/** PUT /api/v1/wardrobe/items/:itemId — full correction, same schema as creation. */
export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const body = await readJson(request);
  if (body === undefined) return malformedJson();

  const parsed = wardrobeItemFormSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);

  const { itemId } = await context.params;

  try {
    const revised = await reviseWardrobeItemForOwner(
      { itemId, ownerId: auth.ownerId, revision: wardrobeItemRevisionFrom(parsed.data) },
      getWardrobeRepository(),
    );

    return revised ? NextResponse.json({ item: revised }) : notFound();
  } catch (error) {
    if (error instanceof WardrobeItemValidationError) {
      return NextResponse.json(
        { error: "Invalid request.", fieldErrors: { [error.field]: [error.message] } },
        { status: 400 },
      );
    }

    throw error;
  }
}
