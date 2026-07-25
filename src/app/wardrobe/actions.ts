"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  assertDevelopmentIdentityEnabled,
  getDevelopmentCurrentUserId,
} from "@/lib/auth/development-current-user";
import { executeCreateWardrobeItem } from "@/modules/wardrobe/application/create-wardrobe-item";
import { developmentWardrobeRepository } from "@/modules/wardrobe/infrastructure/development-wardrobe-store";
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
  assertDevelopmentIdentityEnabled();

  const candidate = {
    category: formValue(formData, "category"),
    name: formValue(formData, "name"),
    brand: formValue(formData, "brand"),
    primaryColor: formValue(formData, "primaryColor"),
    fitNotes: formValue(formData, "fitNotes"),
    ownershipStatus: "owned",
  };

  const result = wardrobeItemFormSchema.safeParse(candidate);
  if (!result.success) {
    return {
      status: "error",
      message: "Review the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const ownerId = getDevelopmentCurrentUserId();
  const item = await executeCreateWardrobeItem(
    parseNewWardrobeItem(ownerId, result.data),
    {
      repository: developmentWardrobeRepository,
      createId: randomUUID,
      now: () => new Date(),
    },
  );

  revalidatePath("/wardrobe");
  revalidatePath(`/wardrobe/${item.id}`);

  return {
    status: "success",
    message: `${item.name} was added to your wardrobe.`,
    fieldErrors: {},
  };
}
