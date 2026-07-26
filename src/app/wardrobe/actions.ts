"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { executeCreateWardrobeItem } from "@/modules/wardrobe/application/create-wardrobe-item";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";
import {
  parseNewWardrobeItem,
  wardrobeItemFormSchema,
} from "@/modules/wardrobe/transport/wardrobe-item-schema";

import type { WardrobeItemFormState } from "./form-state";

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createWardrobeItemAction(
  _previousState: WardrobeItemFormState,
  formData: FormData,
): Promise<WardrobeItemFormState> {
  const candidate = {
    category: formValue(formData, "category"),
    name: formValue(formData, "name"),
    brand: formValue(formData, "brand"),
    primaryColor: formValue(formData, "primaryColor"),
    fitNotes: formValue(formData, "fitNotes"),
    ownershipStatus: formValue(formData, "ownershipStatus") || "owned",
    acquisitionCost: formValue(formData, "acquisitionCost"),
    acquisitionCurrency: formValue(formData, "acquisitionCurrency"),
  };

  const result = wardrobeItemFormSchema.safeParse(candidate);
  if (!result.success) {
    return {
      status: "error",
      message: "Review the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const ownerId = await getCurrentUserId();
  const item = await executeCreateWardrobeItem(
    parseNewWardrobeItem(ownerId, result.data),
    {
      repository: getWardrobeRepository(),
      createId: randomUUID,
      now: () => new Date(),
    },
  );

  revalidatePath("/wardrobe");
  revalidatePath("/insights");
  revalidatePath(`/wardrobe/${item.id}`);

  return {
    status: "success",
    message: `${item.name} was added to your wardrobe.`,
    fieldErrors: {},
  };
}
