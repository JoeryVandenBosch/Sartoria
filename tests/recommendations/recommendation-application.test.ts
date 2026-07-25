import { describe, expect, it } from "vitest";

import { generateWardrobeRecommendation } from "@/modules/recommendations/application/generate-wardrobe-recommendation";
import type {
  RecommendationGateway,
  RecommendationGatewayInput,
} from "@/modules/recommendations/application/recommendation-gateway";
import {
  recordRecommendationCorrection,
  rejectRecommendation,
} from "@/modules/recommendations/application/manage-recommendation-feedback";
import { InMemoryRecommendationRepository } from "@/modules/recommendations/infrastructure/in-memory-recommendation-repository";
import { InMemoryOutfitRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-repository";
import { InMemoryOutfitWearEventRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-wear-event-repository";
import type { StyleProfile } from "@/modules/profile/domain/style-profile";
import { InMemoryStyleProfileRepository } from "@/modules/profile/infrastructure/in-memory-style-profile-repository";
import { createWardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";

function wardrobeRepository() {
  return new InMemoryWardrobeItemRepository([
    createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "tailoring",
        name: "Navy blazer",
        brand: "Gran Sasso",
        primaryColor: "Navy",
      },
      { createId: () => "blazer-1", now: () => new Date("2026-07-25T20:00:00.000Z") },
    ),
    createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "trousers",
        name: "Navy trousers",
        primaryColor: "Navy",
      },
      { createId: () => "trousers-1", now: () => new Date("2026-07-25T20:01:00.000Z") },
    ),
    createWardrobeItem(
      {
        ownerId: "owner-1",
        category: "footwear",
        name: "White sneakers",
        primaryColor: "White",
      },
      { createId: () => "shoes-1", now: () => new Date("2026-07-25T20:02:00.000Z") },
    ),
    createWardrobeItem(
      {
        ownerId: "owner-2",
        category: "shirts",
        name: "Other owner shirt",
        primaryColor: "White",
      },
      { createId: () => "other-owner-1", now: () => new Date("2026-07-25T20:03:00.000Z") },
    ),
  ]);
}

function profile(useMeasurementsForRecommendations: boolean): StyleProfile {
  return Object.freeze({
    ownerId: "owner-1",
    revision: 1,
    fitPreference: "tailored",
    climateProfile: "mixed",
    recommendationMode: "wardrobe-first",
    styleDirections: Object.freeze(["italian-smart-casual"]),
    preferredColours: Object.freeze(["navy", "white"]),
    avoidedColours: Object.freeze(["orange"]),
    preferredBrands: Object.freeze(["Gran Sasso"]),
    avoidedBrands: Object.freeze([]),
    excludedMaterials: Object.freeze(["fur"]),
    measurements: Object.freeze({
      heightCm: 178,
      chestCm: 103,
      waistCm: 99,
      inseamCm: 76,
      shoeSizeEu: 42,
    }),
    useMeasurementsForRecommendations,
    createdAt: "2026-07-25T20:00:00.000Z",
    updatedAt: "2026-07-25T20:00:00.000Z",
  });
}

async function dependencies(gateway: RecommendationGateway | null, consent = false) {
  const profileRepository = new InMemoryStyleProfileRepository();
  await profileRepository.save(profile(consent), 0);
  return {
    wardrobeRepository: wardrobeRepository(),
    profileRepository,
    outfitRepository: new InMemoryOutfitRepository(),
    wearEventRepository: new InMemoryOutfitWearEventRepository(),
    recommendationRepository: new InMemoryRecommendationRepository(),
    gateway,
    createId: () => "recommendation-1",
    now: () => new Date("2026-07-25T21:00:00.000Z"),
  };
}

function provider(output: unknown, capture?: (input: RecommendationGatewayInput) => void): RecommendationGateway {
  return {
    async generate(input) {
      capture?.(input);
      return { output, provider: "test-provider", model: "test-model" };
    },
  };
}

const validProviderOutput = {
  schemaVersion: "1",
  itemReasons: [
    { itemId: "blazer-1", reason: "Adds tailored structure." },
    { itemId: "trousers-1", reason: "Keeps the navy palette coherent." },
  ],
  summary: "A refined navy dinner combination.",
  exclusions: ["Avoid colour: orange"],
  confidence: "high",
};

describe("recommendation application", () => {
  it("accepts schema-valid provider output grounded in owned items", async () => {
    const deps = await dependencies(provider(validProviderOutput));
    const recommendation = await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Dinner", notes: null },
      deps,
    );

    expect(recommendation.provenance.kind).toBe("provider");
    expect(recommendation.itemReasons.map((item) => item.itemId)).toEqual([
      "blazer-1",
      "trousers-1",
    ]);
    expect(await deps.recommendationRepository.findByIdForOwner("recommendation-1", "owner-2")).toBeNull();
  });

  it("falls back when provider output references another owner's item", async () => {
    const deps = await dependencies(
      provider({
        ...validProviderOutput,
        itemReasons: [
          { itemId: "blazer-1", reason: "Owned item." },
          { itemId: "other-owner-1", reason: "Cross-owner item." },
        ],
      }),
    );
    const recommendation = await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Dinner", notes: null },
      deps,
    );

    expect(recommendation.provenance.kind).toBe("fallback");
    expect(recommendation.provenance.reasonCode).toBe("provider-reference-invalid");
    expect(recommendation.itemReasons.every((item) => item.itemId !== "other-owner-1")).toBe(true);
  });

  it("falls back on low confidence or provider failure", async () => {
    const lowConfidence = await dependencies(
      provider({ ...validProviderOutput, confidence: "low" }),
    );
    const lowResult = await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Weekend", notes: null },
      lowConfidence,
    );
    expect(lowResult.provenance.reasonCode).toBe("provider-confidence-low");

    const failing = await dependencies({
      async generate() {
        throw new Error("timeout");
      },
    });
    const failedResult = await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Weekend", notes: null },
      failing,
    );
    expect(failedResult.provenance.reasonCode).toBe("provider-failed");
  });

  it("excludes measurements from provider context until consent is enabled", async () => {
    let captured: RecommendationGatewayInput | null = null;
    const withoutConsent = await dependencies(provider(validProviderOutput, (input) => (captured = input)));
    await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Dinner", notes: null },
      withoutConsent,
    );
    expect(captured?.profile?.measurements).toBeNull();

    const withConsent = await dependencies(provider(validProviderOutput, (input) => (captured = input)), true);
    await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Dinner", notes: null },
      withConsent,
    );
    expect(captured?.profile?.measurements).toMatchObject({ heightCm: 178, shoeSizeEu: 42 });
  });

  it("records owner-scoped correction and rejection", async () => {
    const deps = await dependencies(null);
    const recommendation = await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "Dinner", notes: null },
      deps,
    );
    const corrected = await recordRecommendationCorrection(
      {
        recommendationId: recommendation.id,
        ownerId: "owner-1",
        expectedRevision: 1,
        correction: "Prefer the white sneakers.",
      },
      { repository: deps.recommendationRepository, now: () => new Date("2026-07-25T22:00:00.000Z") },
    );
    const rejected = await rejectRecommendation(
      {
        recommendationId: recommendation.id,
        ownerId: "owner-1",
        expectedRevision: corrected.revision,
        reason: "Too formal.",
      },
      { repository: deps.recommendationRepository, now: () => new Date("2026-07-25T23:00:00.000Z") },
    );

    expect(rejected.status).toBe("rejected");
    expect(rejected.correction).toBe("Prefer the white sneakers.");
    expect(await deps.recommendationRepository.findByIdForOwner(recommendation.id, "owner-2")).toBeNull();
  });
});
