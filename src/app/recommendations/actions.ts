"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import { generateCorrelationId } from "@/lib/observability/correlation-id";
import { getOperationalEventEmitter } from "@/lib/observability/operational-event-runtime";
import { generateWardrobeRecommendation } from "@/modules/recommendations/application/generate-wardrobe-recommendation";
import {
  deleteRecommendation,
  recordRecommendationCorrection,
  rejectRecommendation as rejectRecommendationUseCase,
} from "@/modules/recommendations/application/manage-recommendation-feedback";
import { RecommendationRevisionConflictError } from "@/modules/recommendations/application/recommendation-repository";
import { RecommendationGatewayConfigurationError } from "@/modules/recommendations/infrastructure/http-recommendation-gateway";
import { getRecommendationGateway } from "@/modules/recommendations/infrastructure/recommendation-gateway";
import { getRecommendationRepository } from "@/modules/recommendations/infrastructure/recommendation-repository";
import {
  recommendationCorrectionSchema,
  recommendationRejectionSchema,
  recommendationRequestSchema,
} from "@/modules/recommendations/transport/recommendation-request-schema";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import type { RecommendationFeedbackState } from "./feedback-state";
import type { RecommendationFormState } from "./form-state";

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function configuredGateway() {
  try {
    return getRecommendationGateway();
  } catch (error) {
    if (error instanceof RecommendationGatewayConfigurationError) {
      return null;
    }
    throw error;
  }
}

export async function generateRecommendationAction(
  _previousState: RecommendationFormState,
  formData: FormData,
): Promise<RecommendationFormState> {
  const parsed = recommendationRequestSchema.safeParse({
    occasion: stringValue(formData, "occasion"),
    notes: stringValue(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the recommendation request.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let recommendationId: string;
  try {
    const ownerId = await getCurrentUserId();
    const recommendation = await generateWardrobeRecommendation(
      {
        ownerId,
        occasion: parsed.data.occasion,
        notes: parsed.data.notes,
      },
      {
        wardrobeRepository: getWardrobeRepository(),
        profileRepository: getStyleProfileRepository(),
        outfitRepository: getOutfitRepository(),
        wearEventRepository: getOutfitWearEventRepository(),
        recommendationRepository: getRecommendationRepository(),
        emitter: getOperationalEventEmitter(),
        correlationId: generateCorrelationId(),
        gateway: configuredGateway(),
        createId: randomUUID,
        now: () => new Date(),
      },
    );
    recommendationId = recommendation.id;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sartoria could not create a recommendation.",
      fieldErrors: {},
    };
  }

  redirect(`/recommendations/${encodeURIComponent(recommendationId)}`);
}

export async function correctRecommendationAction(
  _previousState: RecommendationFeedbackState,
  formData: FormData,
): Promise<RecommendationFeedbackState> {
  const parsed = recommendationCorrectionSchema.safeParse({
    expectedRevision: stringValue(formData, "expectedRevision"),
    correction: stringValue(formData, "correction"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a correction of 600 characters or fewer." };
  }

  const recommendationId = stringValue(formData, "recommendationId");
  try {
    const ownerId = await getCurrentUserId();
    const updated = await recordRecommendationCorrection(
      {
        recommendationId,
        ownerId,
        expectedRevision: parsed.data.expectedRevision,
        correction: parsed.data.correction,
      },
      { repository: getRecommendationRepository(), now: () => new Date() },
    );
    revalidatePath(`/recommendations/${encodeURIComponent(updated.id)}`);
    return { status: "success", message: "Your correction was saved privately." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof RecommendationRevisionConflictError
          ? error.message
          : "Sartoria could not save the correction.",
    };
  }
}

export async function rejectRecommendationAction(
  _previousState: RecommendationFeedbackState,
  formData: FormData,
): Promise<RecommendationFeedbackState> {
  const parsed = recommendationRejectionSchema.safeParse({
    expectedRevision: stringValue(formData, "expectedRevision"),
    reason: stringValue(formData, "reason"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The rejection reason must be 500 characters or fewer." };
  }

  const recommendationId = stringValue(formData, "recommendationId");
  try {
    const ownerId = await getCurrentUserId();
    const updated = await rejectRecommendationUseCase(
      {
        recommendationId,
        ownerId,
        expectedRevision: parsed.data.expectedRevision,
        reason: parsed.data.reason,
      },
      { repository: getRecommendationRepository(), now: () => new Date() },
    );
    revalidatePath(`/recommendations/${encodeURIComponent(updated.id)}`);
    return { status: "success", message: "The recommendation was rejected." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof RecommendationRevisionConflictError
          ? error.message
          : "Sartoria could not reject the recommendation.",
    };
  }
}

export async function deleteRecommendationAction(formData: FormData): Promise<never> {
  const recommendationId = stringValue(formData, "recommendationId");
  const ownerId = await getCurrentUserId();
  await deleteRecommendation(
    { recommendationId, ownerId },
    getRecommendationRepository(),
  );
  redirect("/recommendations");
}
