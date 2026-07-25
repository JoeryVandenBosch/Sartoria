"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { saveStyleProfile } from "@/modules/profile/application/save-style-profile";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";
import {
  styleProfileTransportSchema,
  toStyleProfileInput,
} from "@/modules/profile/transport/style-profile-schema";

import type { StyleProfileFormState } from "./form-state";

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

function brands(formData: FormData, name: string): string[] {
  return stringValue(formData, name)
    .split(/[\n,]/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function saveStyleProfileAction(
  _previousState: StyleProfileFormState,
  formData: FormData,
): Promise<StyleProfileFormState> {
  const candidate = {
    expectedRevision: stringValue(formData, "expectedRevision"),
    fitPreference: stringValue(formData, "fitPreference"),
    climateProfile: stringValue(formData, "climateProfile"),
    recommendationMode: stringValue(formData, "recommendationMode"),
    styleDirections: stringValues(formData, "styleDirections"),
    preferredColours: stringValues(formData, "preferredColours"),
    avoidedColours: stringValues(formData, "avoidedColours"),
    preferredBrands: brands(formData, "preferredBrands"),
    avoidedBrands: brands(formData, "avoidedBrands"),
    excludedMaterials: stringValues(formData, "excludedMaterials"),
    heightCm: stringValue(formData, "heightCm"),
    chestCm: stringValue(formData, "chestCm"),
    waistCm: stringValue(formData, "waistCm"),
    inseamCm: stringValue(formData, "inseamCm"),
    shoeSizeEu: stringValue(formData, "shoeSizeEu"),
    useMeasurementsForRecommendations:
      stringValue(formData, "useMeasurementsForRecommendations") === "on",
  };

  const parsed = styleProfileTransportSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted profile fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const ownerId = await getCurrentUserId();
    const profile = await saveStyleProfile(
      {
        ownerId,
        expectedRevision: parsed.data.expectedRevision,
        preferences: toStyleProfileInput(parsed.data),
      },
      {
        repository: getStyleProfileRepository(),
        now: () => new Date(),
      },
    );

    revalidatePath("/profile");

    return {
      status: "success",
      message: `Your private style profile was saved as revision ${profile.revision}.`,
      fieldErrors: {},
    };
  } catch (error) {
    if ((error as { name?: string }).name === "StyleProfileRevisionConflictError") {
      return {
        status: "error",
        message: "This profile changed in another session. Reload the page before saving again.",
        fieldErrors: {},
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "The style profile could not be saved.",
      fieldErrors: {},
    };
  }
}
