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
import { processWardrobeMedia } from "@/modules/media/application/process-wardrobe-media";
import type {
  MediaObjectStore,
  MediaUploadPolicy,
} from "@/modules/media/application/media-object-store";
import type {
  MediaScanner,
  MediaScanResult,
} from "@/modules/media/application/media-scanner";
import { InMemoryWardrobeMediaRepository } from "@/modules/media/infrastructure/in-memory-wardrobe-media-repository";
import {
  createWardrobeMedia,
  markWardrobeMediaUploaded,
} from "@/modules/media/domain/wardrobe-media";

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

    for (const moduleEntry of modules) {
      if (!moduleEntry.isDirectory()) continue;

      const domainDirectory = path.join(moduleRoot, moduleEntry.name, "domain");

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

/**
 * Media boundary.
 *
 * Added with the fix for the review findings on PR #23: this boundary carries
 * five emit points across the most branching logic in the slice and previously
 * had no boundary test at all.
 */
class StubMediaObjectStore implements MediaObjectStore {
  deleted: string[] = [];
  promoted = 0;

  constructor(private readonly failDelete = false) {}

  async readPrefix(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async streamObject(): Promise<AsyncIterable<Uint8Array>> {
    return (async function* empty() {})();
  }

  async createQuarantineUploadPolicy(): Promise<MediaUploadPolicy> {
    throw new Error("not used");
  }

  async inspectQuarantineObject(): Promise<null> {
    return null;
  }

  async promoteQuarantineObject(): Promise<void> {
    this.promoted += 1;
  }

  async createPrivateReadUrl(): Promise<string> {
    return "https://storage.example.test/private";
  }

  async deleteObjects(keys: readonly string[]): Promise<void> {
    if (this.failDelete) {
      throw new Error("object store unavailable");
    }

    this.deleted.push(...keys);
  }
}

function scannerReturning(result: MediaScanResult): MediaScanner {
  return { async scan() { return result; } };
}

async function uploadedMediaRepository(): Promise<InMemoryWardrobeMediaRepository> {
  const repository = new InMemoryWardrobeMediaRepository();
  const initiated = createWardrobeMedia({
    id: "media-1",
    ownerId: "owner-1",
    wardrobeItemId: "item-1",
    originalFilename: "blazer.jpg",
    declaredContentType: "image/jpeg",
    now: NOW,
  });
  await repository.create(initiated);
  await repository.update(markWardrobeMediaUploaded(initiated, 1_024, NOW), "initiated");

  return repository;
}

function mediaDependencies(
  sink: InMemoryOperationalEventSink,
  objectStore: MediaObjectStore,
  mediaRepository: InMemoryWardrobeMediaRepository,
  scanner: MediaScanner,
) {
  return {
    mediaRepository,
    objectStore,
    scanner,
    now: () => NOW,
    emitter: createOperationalEventEmitter({ sink, environment: "test", now: () => NOW }),
  };
}

const SAFE_SCAN: MediaScanResult = {
  verdict: "safe",
  detectedContentType: "image/jpeg",
  scanner: "clamav",
  reference: null,
};

describe("media boundary", () => {
  it("reports a ready disposition once promotion has persisted", async () => {
    const sink = new InMemoryOperationalEventSink();
    const repository = await uploadedMediaRepository();
    const objectStore = new StubMediaObjectStore();

    const media = await processWardrobeMedia(
      { mediaId: "media-1", ownerId: "owner-1" },
      mediaDependencies(sink, objectStore, repository, scannerReturning(SAFE_SCAN)),
    );

    expect(media?.status).toBe("ready");
    expect(sink.eventsNamed("media.processing.completed")).toHaveLength(1);
    expect(sink.events[0]?.attributes).toMatchObject({
      disposition: "ready",
      scanVerdict: "safe",
    });
  });

  it("reports a rejected disposition for malicious content, with no file detail", async () => {
    const sink = new InMemoryOperationalEventSink();
    const repository = await uploadedMediaRepository();

    const media = await processWardrobeMedia(
      { mediaId: "media-1", ownerId: "owner-1" },
      mediaDependencies(
        sink,
        new StubMediaObjectStore(),
        repository,
        scannerReturning({
          verdict: "malicious",
          detectedContentType: "image/jpeg",
          scanner: "clamav",
          reference: "signature-reference",
        }),
      ),
    );

    expect(media?.status).toBe("rejected");
    expect(sink.events[0]?.attributes).toMatchObject({
      disposition: "rejected",
      scanVerdict: "malicious",
      rejectionCode: "malware-detected",
    });

    const serialised = JSON.stringify(sink.events);
    expect(serialised).not.toContain("signature-reference");
    expect(serialised).not.toContain("clamav");
    expect(serialised).not.toContain("blazer.jpg");
    expect(serialised).not.toContain("quarantine/media-1");
    expect(serialised).not.toContain("owner-1");
  });

  it("reports a skipped disposition when the media is not processable", async () => {
    const sink = new InMemoryOperationalEventSink();

    const media = await processWardrobeMedia(
      { mediaId: "absent", ownerId: "owner-1" },
      mediaDependencies(
        sink,
        new StubMediaObjectStore(),
        new InMemoryWardrobeMediaRepository(),
        scannerReturning(SAFE_SCAN),
      ),
    );

    expect(media).toBeNull();
    expect(sink.events[0]?.attributes).toMatchObject({ disposition: "skipped" });
  });

  /**
   * Regression: the rejection event used to be emitted before `rejectAndDelete`
   * ran, so a storage failure produced an event asserting a transition that
   * never persisted.
   */
  it("emits no rejection event when the rejection itself fails to persist", async () => {
    const sink = new InMemoryOperationalEventSink();
    const repository = await uploadedMediaRepository();

    await expect(
      processWardrobeMedia(
        { mediaId: "media-1", ownerId: "owner-1" },
        mediaDependencies(
          sink,
          new StubMediaObjectStore(true),
          repository,
          scannerReturning({
            verdict: "malicious",
            detectedContentType: "image/jpeg",
            scanner: "clamav",
            reference: null,
          }),
        ),
      ),
    ).rejects.toThrow("object store unavailable");

    const persisted = await repository.findByIdForOwner("media-1", "owner-1");

    expect(persisted?.status).toBe("scanning");
    expect(sink.eventsNamed("media.processing.completed")).toHaveLength(0);
  });

  it("still processes the media when the sink throws", async () => {
    const sink = new InMemoryOperationalEventSink({ failOnRecord: true });
    const repository = await uploadedMediaRepository();

    const media = await processWardrobeMedia(
      { mediaId: "media-1", ownerId: "owner-1" },
      mediaDependencies(sink, new StubMediaObjectStore(), repository, scannerReturning(SAFE_SCAN)),
    );

    expect(media?.status).toBe("ready");
  });
});

describe("instrumentation wiring guard", () => {
  async function applicationFilesUnder(directory: string): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await applicationFilesUnder(full)));
      } else if (entry.name.endsWith(".ts")) {
        files.push(full);
      }
    }

    return files;
  }

  /**
   * An optional emitter is one a composition root can forget. Every production
   * call site did, which left three of the five boundaries emitting nothing in
   * any deployed environment while the tests passed. Requiring the dependency
   * makes `tsc` the guard; this test stops the optional marker coming back.
   */
  it("declares the emitter dependency as required in every application use case", async () => {
    const files = await applicationFilesUnder(path.join(process.cwd(), "src", "modules"));
    const offenders: string[] = [];

    for (const file of files) {
      const contents = await readFile(file, "utf8");

      if (/emitter\?\s*:/.test(contents)) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
