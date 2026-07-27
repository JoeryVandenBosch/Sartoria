import {
  reviseWardrobeItem,
  type WardrobeItem,
  type WardrobeItemRevision,
} from "@/modules/wardrobe/domain/wardrobe-item";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

/**
 * Corrects a wardrobe item the owner already holds.
 *
 * Ownership is verified by reading through `findByIdForOwner` rather than
 * trusting an identifier from the request, so one owner cannot revise another
 * owner's item even with a valid identifier.
 */
export async function reviseWardrobeItemForOwner(
  input: Readonly<{ itemId: string; ownerId: string; revision: WardrobeItemRevision }>,
  repository: WardrobeItemRepository,
): Promise<WardrobeItem | null> {
  const existing = await repository.findByIdForOwner(input.itemId, input.ownerId);

  if (!existing) {
    // Indistinguishable from "not yours": the caller learns nothing about
    // whether the identifier exists.
    return null;
  }

  const revised = reviseWardrobeItem(existing, input.revision);
  await repository.save(revised);

  return revised;
}
