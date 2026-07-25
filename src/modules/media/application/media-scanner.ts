import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";

export const mediaScanVerdicts = ["safe", "malicious", "unsupported"] as const;

export type MediaScanVerdict = (typeof mediaScanVerdicts)[number];

export type MediaScanResult = Readonly<{
  verdict: MediaScanVerdict;
  detectedContentType: WardrobeMediaType | null;
  scanner: string;
  reference: string | null;
}>;

export interface MediaScanner {
  scan(input: Readonly<{ mediaId: string; quarantineKey: string }>): Promise<MediaScanResult>;
}
