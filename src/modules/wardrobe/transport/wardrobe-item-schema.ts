import { z } from "zod";

import {
  ownershipStatuses,
  wardrobeCategories,
  type NewWardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

export const wardrobeItemFormSchema = z.object({
  category: z.enum(wardrobeCategories),
  name: z.string().trim().min(1, "Name is required").max(120),
  brand: z.string().trim().max(120).optional(),
  primaryColor: z.string().trim().min(1, "Primary colour is required").max(80),
  ownershipStatus: z.enum(ownershipStatuses).default("owned"),
  fitNotes: z.string().trim().max(500).optional(),
});

export type WardrobeItemFormInput = z.input<typeof wardrobeItemFormSchema>;

export function parseNewWardrobeItem(
  ownerId: string,
  input: WardrobeItemFormInput,
): NewWardrobeItem {
  const parsed = wardrobeItemFormSchema.parse(input);

  return {
    ownerId,
    category: parsed.category,
    name: parsed.name,
    brand: parsed.brand || null,
    primaryColor: parsed.primaryColor,
    ownershipStatus: parsed.ownershipStatus,
    fitNotes: parsed.fitNotes || null,
  };
}
