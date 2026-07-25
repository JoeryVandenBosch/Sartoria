import { describe, expect, it } from "vitest";

import {
  correctWardrobeRecommendation,
  createWardrobeRecommendation,
  rejectWardrobeRecommendation,
  WardrobeRecommendationValidationError,
} from "@/modules/recommendations/domain/wardrobe-recommendation";
import { parseProviderRecommendation } from "@/modules/recommendations/transport/provider-recommendation-schema";

function recommendation() {
  return createWardrobeRecommendation({
    id: "recommendation-1",
    ownerId: "owner-1",
    request: { occasion: "Dinner", notes: "Smart casual" },
    itemReasons: [
      { itemId: "blazer-1", reason: "Adds tailored structure." },
      { itemId: "trousers-1", reason: "Keeps the palette coherent." },
    ],
    summary: "A restrained navy dinner look.",
    exclusions: ["Avoid colour: orange"],
    confidence: "high",
    provenance: {
      kind: "provider",
      provider: "test-provider",
      model: "test-model",
      reasonCode: null,
    },
    now: new Date("2026-07-25T20:00:00.000Z"),
    expiresAt: new Date("2026-08-24T20:00:00.000Z"),
  });
}

describe("wardrobe recommendation domain", () => {
  it("creates a structured recommendation without hidden reasoning", () => {
    const result = recommendation();
    expect(result.provenance.schemaVersion).toBe("1");
    expect(result.itemReasons.map((item) => item.itemId)).toEqual(["blazer-1", "trousers-1"]);
    expect(result).not.toHaveProperty("chainOfThought");
  });

  it("rejects duplicate wardrobe item references", () => {
    expect(() =>
      createWardrobeRecommendation({
        id: "recommendation-1",
        ownerId: "owner-1",
        request: { occasion: "Dinner", notes: null },
        itemReasons: [
          { itemId: "same-item", reason: "First reason." },
          { itemId: "same-item", reason: "Second reason." },
        ],
        summary: "Invalid duplicate result.",
        exclusions: [],
        confidence: "medium",
        provenance: { kind: "fallback", provider: null, model: null, reasonCode: "test" },
        now: new Date("2026-07-25T20:00:00.000Z"),
        expiresAt: new Date("2026-08-24T20:00:00.000Z"),
      }),
    ).toThrow(WardrobeRecommendationValidationError);
  });

  it("records correction and rejection as revision-safe state", () => {
    const corrected = correctWardrobeRecommendation(
      recommendation(),
      "Use the navy trousers instead.",
      new Date("2026-07-25T21:00:00.000Z"),
    );
    const rejected = rejectWardrobeRecommendation(
      corrected,
      "Too formal.",
      new Date("2026-07-25T22:00:00.000Z"),
    );

    expect(corrected.revision).toBe(2);
    expect(rejected.revision).toBe(3);
    expect(rejected.status).toBe("rejected");
    expect(rejected.correction).toBe("Use the navy trousers instead.");
  });
});

describe("provider recommendation schema", () => {
  it("accepts only the versioned structured contract", () => {
    expect(
      parseProviderRecommendation({
        schemaVersion: "1",
        itemReasons: [
          { itemId: "blazer-1", reason: "Tailored structure." },
          { itemId: "trousers-1", reason: "Coherent foundation." },
        ],
        summary: "A grounded look.",
        exclusions: [],
        confidence: "medium",
      }).confidence,
    ).toBe("medium");
  });

  it("rejects free-form or duplicate output", () => {
    expect(() => parseProviderRecommendation({ text: "Wear a blazer." })).toThrow();
    expect(() =>
      parseProviderRecommendation({
        schemaVersion: "1",
        itemReasons: [
          { itemId: "same", reason: "One" },
          { itemId: "same", reason: "Two" },
        ],
        summary: "Duplicate",
        exclusions: [],
        confidence: "high",
      }),
    ).toThrow();
  });
});
