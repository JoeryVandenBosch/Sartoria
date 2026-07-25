"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { createOwnerOutfit } from "@/modules/outfits/application/create-outfit";
import { OutfitWardrobeSelectionError } from "@/modules/outfits/application/verify-outfit-wardrobe-items";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import {
  outfitTransportSchema,
  toOutfitInput,
} from "@/modules/outfits/transport/outfit-schema";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import type { OutfitFormState } from "./form-state";

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

export async function createOutfitAction(
  _previousState: OutfitFormState,
  formData: FormData,
): Promise<OutfitFormState> {
  const candidate = {
    expectedRevision: "0",
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

  let outfitId: string;
  try {
    const ownerId = await getCurrentUserId();
    const outfit = await createOwnerOutfit(
      {
        ownerId,
        outfit: toOutfitInput(parsed.data),
      },
      {
        outfitRepository: getOutfitRepository(),
        wardrobeRepository: getWardrobeRepository(),
        createId: randomUUID,
        now: () => new Date(),
      },
    );
    outfitId = outfit.id;
  } catch (error) {
    if (error instanceof OutfitWardrobeSelectionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          wardrobeItemIds: [error.message],
        },
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "The outfit could not be saved.",
      fieldErrors: {},
    };
  }

  redirect(`/outfits/${encodeURIComponent(outfitId)}`);
}
