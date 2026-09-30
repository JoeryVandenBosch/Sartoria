import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { invalid, malformedJson, readJson, requireOwner } from "@/lib/api/respond";
import { executeCreateWardrobeItem } from "@/modules/wardrobe/application/create-wardrobe-item";
import { listWardrobeItemsForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";
import {
  parseNewWardrobeItem,
  wardrobeItemFormSchema,
} from "@/modules/wardrobe/transport/wardrobe-item-schema";

export const dynamic = "force-dynamic";

/** GET /api/v1/wardrobe/items — the owner's wardrobe. */
export async function GET(): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const items = await listWardrobeItemsForOwner(auth.ownerId, getWardrobeRepository());

  return NextResponse.json({ items }, { headers: { "cache-control": "no-store" } });
}

/** POST /api/v1/wardrobe/items — record an item. Same schema as the web form. */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireOwner();
  if (auth.refusal) return auth.refusal;

  const body = await readJson(request);
  if (body === undefined) return malformedJson();

  const parsed = wardrobeItemFormSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);

  // Rate limiting (Feature 0011, PR #28) attaches here once merged: it is
  // deliberately not imported from an unmerged branch.
  const item = await executeCreateWardrobeItem(parseNewWardrobeItem(auth.ownerId, parsed.data), {
    repository: getWardrobeRepository(),
    createId: randomUUID,
    now: () => new Date(),
  });

  return NextResponse.json({ item }, { status: 201 });
}
