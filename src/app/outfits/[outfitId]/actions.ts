"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { OutfitRevisionConflictError } from "@/modules/outfits/application/outfit-repository";
import { recordOwnerOutfitWear } from "@/modules/outfits/application/record-outfit-wear";
import { updateOwnerOutfit } from "@/modules/outfits/application/update-outfit";
import { OutfitWardrobeSelectionError } from "@/modules/outfits/application/verify-outfit-wardrobe-items";
import { OutfitWearEventValidationError } from "@/modules/outfits/domain/outfit-wear-event";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import {
  outfitTransportSchema,
  toOutfitInput,
} from "@/modules/outfits/transport/outfit-schema";
import {
  outfitWearEventTransportSchema,
  toOutfitWearEventInput,
} from "@/modules/outfits/transport/outfit-wear-event-schema";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import type { OutfitLifecycleFormState } from "./form-state";

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

export async function updateOutfitAction(
  outfitId: string,
  _previousState: OutfitLifecycleFormState,
  formData: FormData,
): Promise<OutfitLifecycleFormState> {
  const candidate = {
    expectedRevision: stringValue(formData, "expectedRevision"),
    name: stringValue(formData, "name"),
    occasion: stringValue(formData, "occasion"),
    stylingNotes: stringValue(formData, "stylingNotes"),
    wardrobeItemIds: stringValues(formData, "wardrobeItemIds"),
  };
  const parsed = outfitTransportSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted outfit fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const ownerId = await getCurrentUserId();
    await updateOwnerOutfit(
      {
        outfitId,
        ownerId,
        expectedRevision: parsed.data.expectedRevision,
        outfit: toOutfitInput(parsed.data),
      },
      {
        outfitRepository: getOutfitRepository(),
        wardrobeRepository: getWardrobeRepository(),
        now: () => new Date(),
      },
    );
  } catch (error) {
    if (error instanceof OutfitRevisionConflictError) {
      return {
        status: "error",
        message: "This outfit changed in another session. Reload before saving your edits.",
        fieldErrors: {},
      };
    }
    if (error instanceof OutfitWardrobeSelectionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: { wardrobeItemIds: [error.message] },
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "The outfit could not be updated.",
      fieldErrors: {},
    };
  }

  revalidatePath("/outfits");
  revalidatePath(`/outfits/${outfitId}`);
  redirect(`/outfits/${encodeURIComponent(outfitId)}`);
}

export async function recordWearEventAction(
  outfitId: string,
  _previousState: OutfitLifecycleFormState,
  formData: FormData,
): Promise<OutfitLifecycleFormState> {
  const parsed = outfitWearEventTransportSchema.safeParse({
    wornOn: stringValue(formData, "wornOn"),
    note: stringValue(formData, "note"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the wear-history fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const ownerId = await getCurrentUserId();
    await recordOwnerOutfitWear(
      {
        outfitId,
        ownerId,
        event: toOutfitWearEventInput(parsed.data),
      },
      {
        outfitRepository: getOutfitRepository(),
        wearEventRepository: getOutfitWearEventRepository(),
        createId: randomUUID,
        now: () => new Date(),
      },
    );
  } catch (error) {
    if (error instanceof OutfitWearEventValidationError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {},
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "The wear event could not be recorded.",
      fieldErrors: {},
    };
  }

  revalidatePath("/outfits");
  revalidatePath(`/outfits/${outfitId}`);
  return {
    status: "success",
    message: "Wear event recorded privately.",
    fieldErrors: {},
  };
}
