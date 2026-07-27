import {
  NULL_OPERATIONAL_EVENT_EMITTER,
  type OperationalEventEmitter,
} from "@/lib/observability/operational-event-emitter";
import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { MediaScanner } from "@/modules/media/application/media-scanner";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import {
  failWardrobeMedia,
  markWardrobeMediaReady,
  markWardrobeMediaScanning,
  rejectWardrobeMedia,
  type WardrobeMedia,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

function mediaTypesCompatible(
  declared: WardrobeMediaType,
  detected: WardrobeMediaType,
): boolean {
  if (declared === detected) {
    return true;
  }

  return (
    (declared === "image/heic" || declared === "image/heif") &&
    (detected === "image/heic" || detected === "image/heif")
  );
}

async function rejectAndDelete(
  media: WardrobeMedia,
  input: Readonly<{
    code: "malware-detected" | "unsupported-type";
    detectedContentType: WardrobeMediaType | null;
    scanner: string;
    scanReference: string | null;
  }>,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    now: () => Date;
  }>,
): Promise<WardrobeMedia> {
  await dependencies.objectStore.deleteObjects([media.quarantineKey]);

  const rejected = rejectWardrobeMedia(media, {
    code: input.code,
    detectedContentType: input.detectedContentType,
    scanner: input.scanner,
    scanReference: input.scanReference,
    now: dependencies.now(),
  });
  await dependencies.mediaRepository.update(rejected, "scanning");
  return rejected;
}

export async function processWardrobeMedia(
  input: Readonly<{ mediaId: string; ownerId: string }>,
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    scanner: MediaScanner;
    now: () => Date;
    /** Optional so existing callers and tests are unaffected. */
    emitter?: OperationalEventEmitter;
  }>,
): Promise<WardrobeMedia | null> {
  const emitter = dependencies.emitter ?? NULL_OPERATIONAL_EVENT_EMITTER;
  const startedAt = Date.now();
  const pending = await dependencies.mediaRepository.findByIdForOwner(
    input.mediaId,
    input.ownerId,
  );

  if (!pending || (pending.status !== "uploaded" && pending.status !== "failed")) {
    emitter.emit({
      name: "media.processing.completed",
      severity: "info",
      outcome: "skipped",
      durationMs: Date.now() - startedAt,
      attributes: { disposition: "skipped" },
    });

    return null;
  }

  const scanning = markWardrobeMediaScanning(pending, dependencies.now());
  await dependencies.mediaRepository.update(scanning, pending.status);

  try {
    const result = await dependencies.scanner.scan({
      mediaId: scanning.id,
      quarantineKey: scanning.quarantineKey,
    });

    if (result.verdict === "malicious") {
      emitter.emit({
        name: "media.processing.completed",
        severity: "warning",
        outcome: "failure",
        durationMs: Date.now() - startedAt,
        attributes: {
          disposition: "rejected",
          scanVerdict: "malicious",
          rejectionCode: "malware-detected",
        },
      });

      return rejectAndDelete(
        scanning,
        {
          code: "malware-detected",
          detectedContentType: result.detectedContentType,
          scanner: result.scanner,
          scanReference: result.reference,
        },
        dependencies,
      );
    }

    if (
      result.verdict !== "safe" ||
      !result.detectedContentType ||
      !mediaTypesCompatible(scanning.declaredContentType, result.detectedContentType)
    ) {
      emitter.emit({
        name: "media.processing.completed",
        severity: "warning",
        outcome: "failure",
        durationMs: Date.now() - startedAt,
        attributes: {
          disposition: "rejected",
          // The declared and detected content types are deliberately omitted:
          // they describe the user's file, not the health of the pipeline.
          scanVerdict: result.verdict === "safe" ? "safe" : "unsupported",
          rejectionCode: "unsupported-type",
        },
      });

      return rejectAndDelete(
        scanning,
        {
          code: "unsupported-type",
          detectedContentType: result.detectedContentType,
          scanner: result.scanner,
          scanReference: result.reference,
        },
        dependencies,
      );
    }

    const privateKey = `private/${scanning.id}`;
    await dependencies.objectStore.promoteQuarantineObject({
      quarantineKey: scanning.quarantineKey,
      privateKey,
      detectedContentType: result.detectedContentType,
    });

    const ready = markWardrobeMediaReady(scanning, {
      detectedContentType: result.detectedContentType,
      privateKey,
      scanner: result.scanner,
      scanReference: result.reference,
      now: dependencies.now(),
    });
    await dependencies.mediaRepository.update(ready, "scanning");

    emitter.emit({
      name: "media.processing.completed",
      severity: "info",
      outcome: "success",
      durationMs: Date.now() - startedAt,
      attributes: { disposition: "ready", scanVerdict: "safe" },
    });

    return ready;
  } catch (error) {
    const failed = failWardrobeMedia(scanning, null, dependencies.now());
    await dependencies.mediaRepository.update(failed, "scanning");

    // The error is classified, never serialised. It is rethrown unchanged so
    // existing failure handling is preserved exactly.
    emitter.emit({
      name: "media.processing.completed",
      severity: "error",
      outcome: "failure",
      durationMs: Date.now() - startedAt,
      attributes: {
        disposition: "failed",
        failureClassification:
          (error as { name?: unknown })?.name === "TimeoutError" ? "timeout" : "unexpected",
      },
    });

    throw error;
  }
}
