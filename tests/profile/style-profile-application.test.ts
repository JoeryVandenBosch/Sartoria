import { describe, expect, it } from "vitest";

import { getStyleProfileForOwner } from "@/modules/profile/application/query-style-profile";
import { resetStyleProfile } from "@/modules/profile/application/reset-style-profile";
import { saveStyleProfile } from "@/modules/profile/application/save-style-profile";
import { StyleProfileRevisionConflictError } from "@/modules/profile/application/style-profile-repository";
import type { StyleProfileInput } from "@/modules/profile/domain/style-profile";
import { InMemoryStyleProfileRepository } from "@/modules/profile/infrastructure/in-memory-style-profile-repository";

const preferences: StyleProfileInput = {
  fitPreference: "tailored",
  climateProfile: "mixed",
  recommendationMode: "wardrobe-first",
  styleDirections: ["classic", "italian-smart-casual"],
  preferredColours: ["navy", "white"],
  avoidedColours: ["orange"],
  preferredBrands: ["Gran Sasso"],
  avoidedBrands: [],
  excludedMaterials: ["fur"],
  measurements: {
    heightCm: null,
    chestCm: null,
    waistCm: null,
    inseamCm: null,
    shoeSizeEu: null,
  },
  useMeasurementsForRecommendations: false,
};

describe("style profile application", () => {
  it("creates, updates, queries, and resets an owner-scoped profile", async () => {
    const repository = new InMemoryStyleProfileRepository();
    const created = await saveStyleProfile(
      { ownerId: "owner-1", expectedRevision: 0, preferences },
      {
        repository,
        now: () => new Date("2026-07-25T18:00:00.000Z"),
      },
    );

    expect(created.revision).toBe(1);
    expect(await getStyleProfileForOwner("owner-1", repository)).toEqual(created);
    expect(await getStyleProfileForOwner("owner-2", repository)).toBeNull();

    const updated = await saveStyleProfile(
      {
        ownerId: "owner-1",
        expectedRevision: 1,
        preferences: { ...preferences, recommendationMode: "balanced" },
      },
      {
        repository,
        now: () => new Date("2026-07-25T19:00:00.000Z"),
      },
    );

    expect(updated.revision).toBe(2);
    expect(updated.recommendationMode).toBe("balanced");
    expect(await resetStyleProfile({ ownerId: "owner-1", expectedRevision: 2 }, repository)).toBe(
      true,
    );
    expect(await getStyleProfileForOwner("owner-1", repository)).toBeNull();
  });

  it("rejects stale writes and stale resets", async () => {
    const repository = new InMemoryStyleProfileRepository();
    await saveStyleProfile(
      { ownerId: "owner-1", expectedRevision: 0, preferences },
      { repository, now: () => new Date("2026-07-25T18:00:00.000Z") },
    );

    await expect(
      saveStyleProfile(
        { ownerId: "owner-1", expectedRevision: 0, preferences },
        { repository, now: () => new Date("2026-07-25T19:00:00.000Z") },
      ),
    ).rejects.toBeInstanceOf(StyleProfileRevisionConflictError);

    await expect(
      resetStyleProfile({ ownerId: "owner-1", expectedRevision: 0 }, repository),
    ).rejects.toBeInstanceOf(StyleProfileRevisionConflictError);
  });

  it("does not let one owner reset another owner's profile", async () => {
    const repository = new InMemoryStyleProfileRepository();
    await saveStyleProfile(
      { ownerId: "owner-1", expectedRevision: 0, preferences },
      { repository, now: () => new Date("2026-07-25T18:00:00.000Z") },
    );

    expect(await resetStyleProfile({ ownerId: "owner-2", expectedRevision: 0 }, repository)).toBe(
      false,
    );
    expect(await getStyleProfileForOwner("owner-1", repository)).not.toBeNull();
  });
});
