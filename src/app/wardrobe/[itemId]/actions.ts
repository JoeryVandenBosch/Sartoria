"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { reviseWardrobeItemForOwner } from "@/modules/wardrobe/application/revise-wardrobe-item";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";
import { wardrobeItemRevisionFrom } from "@/modules/wardrobe/transport/wardrobe-item-schema";
import { WardrobeItemValidationError } from "@/modules/wardrobe/domain/wardrobe-item";

import type { WardrobeItemFormState } from "../form-state";

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function reviseWardrobeItemAction(
  previousState: WardrobeItemFormState,
  formData: FormData,
): Promise<WardrobeItemFormState> {
  const itemId = formValue(formData, "itemId");
  const ownerId = await getCurrentUserId();

  const { z } = await import("zod");
  const { wardrobeItemFormSchema } = await import(
    "@/modules/wardrobe/transport/wardrobe-item-schema"
  );

  const result = wardrobeItemFormSchema.safeParse({
    category: formValue(formData, "category"),
    name: formValue(formData, "name"),
    brand: formValue(formData, "brand"),
    primaryColor: formValue(formData, "primaryColor"),
    ownershipStatus: formValue(formData, "ownershipStatus"),
    fitNotes: formValue(formData, "fitNotes"),
    acquisitionCost: formValue(formData, "acquisitionCost"),
    acquisitionCurrency: formValue(formData, "acquisitionCurrency"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Review the highlighted fields.",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      submissionId: (previousState.submissionId ?? 0) + 1,
    };
  }

  try {
    const revised = await reviseWardrobeItemForOwner(
      {
        itemId,
        ownerId,
        revision: wardrobeItemRevisionFrom(result.data),
      },
      getWardrobeRepository(),
    );

    if (!revised) {
      // Same answer whether the item is absent or belongs to someone else.
      return {
        status: "error",
        message: "That item could not be found.",
        fieldErrors: {},
        submissionId: (previousState.submissionId ?? 0) + 1,
      };
    }

    revalidatePath("/wardrobe");
    revalidatePath(`/wardrobe/${itemId}`);

    return {
      status: "success",
      message: "Your changes were saved.",
      fieldErrors: {},
      submissionId: (previousState.submissionId ?? 0) + 1,
    };
  } catch (error) {
    if (error instanceof WardrobeItemValidationError) {
      return {
        status: "error",
        message: "Review the highlighted fields.",
        fieldErrors: { [error.field]: [error.message] },
        submissionId: (previousState.submissionId ?? 0) + 1,
      };
    }

    throw error;
  }
}
