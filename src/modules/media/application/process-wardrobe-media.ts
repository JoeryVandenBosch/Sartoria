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

export async function processNextWardrobeMedia(
  dependencies: Readonly<{
    mediaRepository: WardrobeMediaRepository;
    objectStore: MediaObjectStore;
    scanner: MediaScanner;
    now: () => Date;
  }>,
): Promise<WardrobeMedia | null> {
  const pending = await dependencies.mediaRepository.findNextPendingScan();
  if (!pending) {
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
    return ready;
  } catch (error) {
    const failed = failWardrobeMedia(scanning, null, dependencies.now());
    await dependencies.mediaRepository.update(failed, "scanning");
    throw error;
  }
}
