import type { OperationalEventEmitter } from "@/lib/observability/operational-event-emitter";
import { buildRecommendationContext } from "@/modules/recommendations/application/build-recommendation-context";
import { createDeterministicRecommendation } from "@/modules/recommendations/application/deterministic-recommendation-fallback";
import type { RecommendationGateway } from "@/modules/recommendations/application/recommendation-gateway";
import type { RecommendationRepository } from "@/modules/recommendations/application/recommendation-repository";
import {
  createWardrobeRecommendation,
  type WardrobeRecommendation,
} from "@/modules/recommendations/domain/wardrobe-recommendation";
import { parseProviderRecommendation } from "@/modules/recommendations/transport/provider-recommendation-schema";
import type { OutfitRepository } from "@/modules/outfits/application/outfit-repository";
import type { OutfitWearEventRepository } from "@/modules/outfits/application/outfit-wear-event-repository";
import type { StyleProfileRepository } from "@/modules/profile/application/style-profile-repository";
import type { WardrobeItemRepository } from "@/modules/wardrobe/application/wardrobe-item-repository";

export type RecommendationFallbackReason =
  | "provider-not-configured"
  | "provider-failed"
  | "provider-output-invalid"
  | "provider-reference-invalid"
  | "provider-confidence-low";

export async function generateWardrobeRecommendation(
  input: Readonly<{
    ownerId: string;
    occasion: string;
    notes: string | null;
  }>,
  dependencies: Readonly<{
    wardrobeRepository: WardrobeItemRepository;
    profileRepository: StyleProfileRepository;
    outfitRepository: OutfitRepository;
    wearEventRepository: OutfitWearEventRepository;
    recommendationRepository: RecommendationRepository;
    gateway: RecommendationGateway | null;
    createId: () => string;
    now: () => Date;
    /**
     * Required. Injected rather than resolved globally, keeping this use case
     * pure and independent of observability configuration — but not optional,
     * because an optional emitter is one a composition root can forget, and
     * every production call site did. A caller that wants no telemetry passes
     * `NULL_OPERATIONAL_EVENT_EMITTER` explicitly.
     */
    emitter: OperationalEventEmitter;
    /** Groups every event emitted by one generation. */
    correlationId?: string;
  }>,
): Promise<WardrobeRecommendation> {
  const { emitter, correlationId } = dependencies;
  const startedAt = Date.now();
  const context = await buildRecommendationContext(input, dependencies);
  const availableItemIds = new Set(context.wardrobe.map((item) => item.id));

  let result = createDeterministicRecommendation(context);
  let provenance: Readonly<{
    kind: "provider" | "fallback";
    provider: string | null;
    model: string | null;
    reasonCode: RecommendationFallbackReason | null;
  }> = {
    kind: "fallback",
    provider: null,
    model: null,
    reasonCode: "provider-not-configured",
  };

  if (dependencies.gateway) {
    try {
      const providerResult = await dependencies.gateway.generate(context);
      const parsed = parseProviderRecommendation(providerResult.output);

      if (parsed.confidence === "low") {
        provenance = {
          kind: "fallback",
          provider: providerResult.provider,
          model: providerResult.model,
          reasonCode: "provider-confidence-low",
        };
      } else if (
        parsed.itemReasons.some((item) => !availableItemIds.has(item.itemId)) ||
        new Set(parsed.itemReasons.map((item) => item.itemId)).size !== parsed.itemReasons.length
      ) {
        provenance = {
          kind: "fallback",
          provider: providerResult.provider,
          model: providerResult.model,
          reasonCode: "provider-reference-invalid",
        };
      } else {
        result = parsed;
        provenance = {
          kind: "provider",
          provider: providerResult.provider,
          model: providerResult.model,
          reasonCode: null,
        };
      }
    } catch (error) {
      provenance = {
        kind: "fallback",
        provider: null,
        model: null,
        reasonCode:
          (error as { name?: string }).name === "ZodError"
            ? "provider-output-invalid"
            : "provider-failed",
      };
    }
  }

  const now = dependencies.now();
  const recommendation = createWardrobeRecommendation({
    id: dependencies.createId(),
    ownerId: input.ownerId,
    request: { occasion: input.occasion, notes: input.notes },
    itemReasons: result.itemReasons,
    summary: result.summary,
    exclusions: result.exclusions,
    confidence: result.confidence,
    provenance,
    now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000),
  });

  await dependencies.recommendationRepository.create(recommendation);

  // Provenance only: never the prompt, profile, wardrobe contents, item
  // identifiers, provider name, model name, or provider response.
  emitter.emit({
    name: "recommendation.generation.completed",
    severity: "info",
    outcome: provenance.kind === "provider" ? "success" : "degraded",
    correlationId,
    durationMs: Date.now() - startedAt,
    attributes: {
      generationSource: provenance.kind,
      fellBackToDeterministic: provenance.kind === "fallback",
      ...(provenance.reasonCode === null ? {} : { fallbackReason: provenance.reasonCode }),
    },
  });

  return recommendation;
}
