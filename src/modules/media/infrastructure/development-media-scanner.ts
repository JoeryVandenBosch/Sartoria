import { fileTypeFromBuffer } from "file-type";

import type { MediaObjectReader } from "@/modules/media/application/media-object-store";
import type {
  MediaScanner,
  MediaScanResult,
} from "@/modules/media/application/media-scanner";
import {
  allowedWardrobeMediaTypes,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

export class DevelopmentMediaScanner implements MediaScanner {
  constructor(private readonly objectReader: MediaObjectReader) {}

  async scan(input: Readonly<{ mediaId: string; quarantineKey: string }>): Promise<MediaScanResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Development media scanning is disabled in production.");
    }

    const prefix = await this.objectReader.readPrefix(input.quarantineKey, 8_192);
    const detected = await fileTypeFromBuffer(prefix);
    const detectedContentType = allowedWardrobeMediaTypes.includes(
      detected?.mime as WardrobeMediaType,
    )
      ? (detected?.mime as WardrobeMediaType)
      : null;

    return {
      verdict: detectedContentType ? "safe" : "unsupported",
      detectedContentType,
      scanner: "development-signature-only",
      reference: null,
    };
  }
}
