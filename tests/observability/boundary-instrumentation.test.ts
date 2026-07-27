import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { InMemoryOperationalEventSink } from "@/lib/observability/adapters/in-memory-operational-event-sink";
import { createOperationalEventEmitter } from "@/lib/observability/operational-event-emitter";
import { generateWardrobeRecommendation } from "@/modules/recommendations/application/generate-wardrobe-recommendation";
import type { RecommendationGateway } from "@/modules/recommendations/application/recommendation-gateway";
import { InMemoryRecommendationRepository } from "@/modules/recommendations/infrastructure/in-memory-recommendation-repository";
import { InMemoryOutfitRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-repository";
import { InMemoryOutfitWearEventRepository } from "@/modules/outfits/infrastructure/in-memory-outfit-wear-event-repository";
import { InMemoryStyleProfileRepository } from "@/modules/profile/infrastructure/in-memory-style-profile-repository";
import { createWardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";
import { InMemoryWardrobeItemRepository } from "@/modules/wardrobe/infrastructure/in-memory-wardrobe-item-repository";
import { bootstrapOwner } from "@/modules/staging/application/bootstrap-owner";

const NOW = new Date("2026-07-25T20:00:00.000Z");

function wardrobe() {
  return new InMemoryWardrobeItemRepository([
    createWardrobeItem(
      { ownerId: "owner-1", category: "tailoring", name: "Navy blazer", primaryColor: "Navy" },
      { createId: () => "blazer-1", now: () => NOW },
    ),
    createWardrobeItem(
      { ownerId: "owner-1", category: "trousers", name: "Navy trousers", primaryColor: "Navy" },
      { createId: () => "trousers-1", now: () => NOW },
    ),
    createWardrobeItem(
      { ownerId: "owner-1", category: "footwear", name: "White sneakers", primaryColor: "White" },
      { createId: () => "shoes-1", now: () => NOW },
    ),
  ]);
}

function recommendationDependencies(
  sink: InMemoryOperationalEventSink,
  gateway: RecommendationGateway | null,
) {
  return {
    wardrobeRepository: wardrobe(),
    profileRepository: new InMemoryStyleProfileRepository(),
    outfitRepository: new InMemoryOutfitRepository(),
    wearEventRepository: new InMemoryOutfitWearEventRepository(),
    recommendationRepository: new InMemoryRecommendationRepository(),
    gateway,
    createId: () => "recommendation-1",
    now: () => NOW,
    emitter: createOperationalEventEmitter({ sink, environment: "test", now: () => NOW }),
  };
}

const REQUEST = { ownerId: "owner-1", occasion: "dinner", notes: null } as const;

describe("recommendation boundary", () => {
  it("reports a deterministic fallback when no provider is configured", async () => {
    const sink = new InMemoryOperationalEventSink();

    await generateWardrobeRecommendation(REQUEST, recommendationDependencies(sink, null));

    const [event] = sink.eventsNamed("recommendation.generation.completed");

    expect(event).toBeDefined();
    expect(event?.outcome).toBe("degraded");
    expect(event?.attributes).toEqual({
      generationSource: "fallback",
      fellBackToDeterministic: true,
      fallbackReason: "provider-not-configured",
    });
  });

  it("reports a provider failure without the provider name or error text", async () => {
    const sink = new InMemoryOperationalEventSink();
    const gateway: RecommendationGateway = {
      generate() {
        throw new Error("openai: 429 rate limited for account acct_9182");
      },
    };

    await generateWardrobeRecommendation(REQUEST, recommendationDependencies(sink, gateway));

    const [event] = sink.eventsNamed("recommendation.generation.completed");

    expect(event?.attributes).toEqual({
      generationSource: "fallback",
      fellBackToDeterministic: true,
      fallbackReason: "provider-failed",
    });

    const serialised = JSON.stringify(event);
    expect(serialised).not.toContain("openai");
    expect(serialised).not.toContain("acct_9182");
    expect(serialised).not.toContain("rate limited");
  });

  it("never includes the occasion, notes, owner, or item identifiers", async () => {
    const sink = new InMemoryOperationalEventSink();

    await generateWardrobeRecommendation(
      { ownerId: "owner-1", occasion: "wedding in Milan", notes: "wife dislikes brown" },
      recommendationDependencies(sink, null),
    );

    const serialised = JSON.stringify(sink.events);

    for (const forbidden of [
      "owner-1",
      "wedding in Milan",
      "Milan",
      "wife dislikes brown",
      "blazer-1",
      "Navy",
      "recommendation-1",
    ]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  /** Acceptance criterion 5, at a real boundary. */
  it("still produces a recommendation when the sink throws", async () => {
    const failing = new InMemoryOperationalEventSink({ failOnRecord: true });
    const dependencies = {
      ...recommendationDependencies(new InMemoryOperationalEventSink(), null),
      emitter: createOperationalEventEmitter({
        sink: failing,
        environment: "test",
        onSinkFailure: () => undefined,
      }),
    };

    const recommendation = await generateWardrobeRecommendation(REQUEST, dependencies);

    expect(recommendation.id).toBe("recommendation-1");
    expect(recommendation.itemReasons.length).toBeGreaterThan(0);
  });
});

describe("staging bootstrap boundary", () => {
  const identities = {
    owner: { name: "Owner", email: "owner@example.test", password: "correct-horse-9" },
    isolationUser: { name: "Isolation", email: "isolation@example.test", password: "battery-42" },
    operatorReference: "operator-7",
  } as const;

  function dependencies(sink: InMemoryOperationalEventSink) {
    let created = 0;

    return {
      store: {
        reserve: async () => undefined,
        complete: async () => undefined,
      },
      createAuthenticationUser: async (input: { name: string; email: string }) => {
        created += 1;
        return { id: `user-${created}`, name: input.name, email: input.email };
      },
      now: () => NOW,
      emitter: createOperationalEventEmitter({ sink, environment: "test", now: () => NOW }),
    };
  }

  it("emits counts only, never identity content", async () => {
    const sink = new InMemoryOperationalEventSink();

    await bootstrapOwner(identities, dependencies(sink));

    const [event] = sink.eventsNamed("staging.identity.bootstrapped");

    expect(event?.attributes).toEqual({ identitiesCreated: 2, identitiesAlreadyPresent: 0 });

    const serialised = JSON.stringify(sink.events);

    for (const forbidden of [
      "owner@example.test",
      "isolation@example.test",
      "correct-horse-9",
      "battery-42",
      "operator-7",
      "user-1",
      "Owner",
    ]) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("classifies a duplicate-email rejection without echoing the address", async () => {
    const sink = new InMemoryOperationalEventSink();

    await expect(
      bootstrapOwner(
        {
          ...identities,
          isolationUser: { ...identities.isolationUser, email: identities.owner.email },
        },
        dependencies(sink),
      ),
    ).rejects.toThrow();

    const [event] = sink.eventsNamed("staging.identity.bootstrapped");

    expect(event?.attributes).toEqual({
      identitiesCreated: 0,
      failureClassification: "validation",
    });
    expect(JSON.stringify(sink.events)).not.toContain("owner@example.test");
  });
});

/**
 * Acceptance criterion 4.
 *
 * Asserted against the source tree rather than a convention, so a future
 * import into a domain folder fails the build rather than review.
 */
describe("architecture boundary", () => {
  async function typescriptFilesUnder(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await typescriptFilesUnder(full)));
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        files.push(full);
      }
    }

    return files;
  }

  it("no domain module imports the observability implementation", async () => {
    const moduleRoot = path.join(process.cwd(), "src", "modules");
    const modules = await readdir(moduleRoot, { withFileTypes: true });
    const offenders: string[] = [];

    for (const module of modules) {
      if (!module.isDirectory()) continue;

      const domainDirectory = path.join(moduleRoot, module.name, "domain");

      let files: readonly string[];
      try {
        files = await typescriptFilesUnder(domainDirectory);
      } catch {
        continue;
      }

      for (const file of files) {
        const contents = await readFile(file, "utf8");

        if (contents.includes("lib/observability")) {
          offenders.push(path.relative(process.cwd(), file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no source file imports a third-party observability or telemetry SDK", async () => {
    const files = await typescriptFilesUnder(path.join(process.cwd(), "src"));
    const forbiddenPackages = [
      "@opentelemetry",
      "@sentry",
      "datadog",
      "dd-trace",
      "newrelic",
      "pino",
      "winston",
      "posthog",
    ];
    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, "utf8");

      for (const packageName of forbiddenPackages) {
        if (contents.includes(`from "${packageName}`) || contents.includes(`require("${packageName}`)) {
          offenders.push(`${path.relative(process.cwd(), file)} -> ${packageName}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
