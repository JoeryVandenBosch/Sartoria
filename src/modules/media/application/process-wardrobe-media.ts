import type { OperationalEventEmitter } from "@/lib/observability/operational-event-emitter";
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
    /**
     * Required. An optional emitter let every production call site omit it
     * silently, which left this boundary emitting nothing at all. A caller that
     * genuinely wants no telemetry passes `NULL_OPERATIONAL_EVENT_EMITTER` and
     * says so.
     */
    emitter: OperationalEventEmitter;
    /** Groups every event emitted by one pipeline run. */
    correlationId?: string;
  }>,
): Promise<WardrobeMedia | null> {
  const { emitter, correlationId } = dependencies;
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
      correlationId,
      durationMs: Date.now() - startedAt,
      attributes: { disposition: "skipped" },
    });

    return null;
  }

  const scanning = markWardrobeMediaScanning(pending, dependencies.now());
  await dependencies.mediaRepository.update(scanning, pending.status);

  let ready: WardrobeMedia;

  try {
    const result = await dependencies.scanner.scan({
      mediaId: scanning.id,
      quarantineKey: scanning.quarantineKey,
    });

    if (result.verdict === "malicious") {
      // Emitted from the fulfilment handler, not before the call: the previous
      // ordering reported `rejected` before the object deletion and repository
      // update had happened, so a storage failure produced an event asserting a
      // transition that never persisted.
      //
      // Attached rather than awaited on purpose. `return promise` inside a
      // `try` does not route that promise's rejection into the `catch` — the
      // implicit await happens after the block completes. Switching to
      // `return await` would change which domain state is persisted on this
      // path, which is a domain fix, not an observability one. Keeping the
      // attachment preserves the existing exception routing exactly.
      return rejectAndDelete(
        scanning,
        {
          code: "malware-detected",
          detectedContentType: result.detectedContentType,
          scanner: result.scanner,
          scanReference: result.reference,
        },
        dependencies,
      ).then((rejected) => {
        emitter.emit({
          name: "media.processing.completed",
          severity: "warning",
          outcome: "failure",
          correlationId,
          durationMs: Date.now() - startedAt,
          attributes: {
            disposition: "rejected",
            scanVerdict: "malicious",
            rejectionCode: "malware-detected",
          },
        });

        return rejected;
      });
    }

    if (
      result.verdict !== "safe" ||
      !result.detectedContentType ||
      !mediaTypesCompatible(scanning.declaredContentType, result.detectedContentType)
    ) {
      // See the malicious branch: emitted only once the rejection has persisted,
      // and attached rather than awaited to preserve exception routing.
      const scanVerdict = result.verdict === "safe" ? "safe" : "unsupported";

      return rejectAndDelete(
        scanning,
        {
          code: "unsupported-type",
          detectedContentType: result.detectedContentType,
          scanner: result.scanner,
          scanReference: result.reference,
        },
        dependencies,
      ).then((rejected) => {
        emitter.emit({
          name: "media.processing.completed",
          severity: "warning",
          outcome: "failure",
          correlationId,
          durationMs: Date.now() - startedAt,
          attributes: {
            disposition: "rejected",
            // The declared and detected content types are deliberately omitted:
            // they describe the user's file, not the health of the pipeline.
            scanVerdict,
            rejectionCode: "unsupported-type",
          },
        });

        return rejected;
      });
    }

    const privateKey = `private/${scanning.id}`;
    await dependencies.objectStore.promoteQuarantineObject({
      quarantineKey: scanning.quarantineKey,
      privateKey,
      detectedContentType: result.detectedContentType,
    });

    ready = markWardrobeMediaReady(scanning, {
      detectedContentType: result.detectedContentType,
      privateKey,
      scanner: result.scanner,
      scanReference: result.reference,
      now: dependencies.now(),
    });
    await dependencies.mediaRepository.update(ready, "scanning");
  } catch (error) {
    const failed = failWardrobeMedia(scanning, null, dependencies.now());
    await dependencies.mediaRepository.update(failed, "scanning");

    // The error is classified, never serialised. It is rethrown unchanged so
    // existing failure handling is preserved exactly.
    emitter.emit({
      name: "media.processing.completed",
      severity: "error",
      outcome: "failure",
      correlationId,
      durationMs: Date.now() - startedAt,
      attributes: {
        disposition: "failed",
        failureClassification:
          (error as { name?: unknown })?.name === "TimeoutError" ? "timeout" : "unexpected",
      },
    });

    throw error;
  }

  // Emitted outside the try. Inside it, a telemetry fault would have been routed
  // into the catch above, which persists the media as failed — a domain state
  // change caused by observability.
  emitter.emit({
    name: "media.processing.completed",
    severity: "info",
    outcome: "success",
    correlationId,
    durationMs: Date.now() - startedAt,
    attributes: { disposition: "ready", scanVerdict: "safe" },
  });

  return ready;
}
