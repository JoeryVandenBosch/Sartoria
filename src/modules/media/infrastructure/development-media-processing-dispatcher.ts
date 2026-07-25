import type { MediaObjectStore } from "@/modules/media/application/media-object-store";
import type { MediaProcessingDispatcher } from "@/modules/media/application/media-processing-dispatcher";
import type { MediaScanner } from "@/modules/media/application/media-scanner";
import type { WardrobeMediaRepository } from "@/modules/media/application/wardrobe-media-repository";
import { processWardrobeMedia } from "@/modules/media/application/process-wardrobe-media";

export class DevelopmentMediaProcessingDispatcher implements MediaProcessingDispatcher {
  constructor(
    private readonly dependencies: Readonly<{
      mediaRepository: WardrobeMediaRepository;
      objectStore: MediaObjectStore;
      scanner: MediaScanner;
      now: () => Date;
    }>,
  ) {}

  async dispatch(input: Readonly<{ mediaId: string; ownerId: string }>): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Development media processing is disabled in production.");
    }

    await processWardrobeMedia(input, this.dependencies);
  }
}
