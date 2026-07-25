export const allowedWardrobeMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type WardrobeMediaType = (typeof allowedWardrobeMediaTypes)[number];

export const wardrobeMediaStatuses = [
  "initiated",
  "uploaded",
  "scanning",
  "ready",
  "rejected",
  "failed",
  "deleted",
] as const;

export type WardrobeMediaStatus = (typeof wardrobeMediaStatuses)[number];

export const mediaRejectionCodes = [
  "unsupported-type",
  "malware-detected",
  "empty-object",
  "oversized-object",
  "metadata-mismatch",
  "object-missing",
] as const;

export type MediaRejectionCode = (typeof mediaRejectionCodes)[number];

export const maximumWardrobeMediaBytes = 20 * 1024 * 1024;
export const mediaPolicyLifetimeSeconds = 300;

export type WardrobeMedia = Readonly<{
  id: string;
  ownerId: string;
  wardrobeItemId: string;
  originalFilename: string;
  declaredContentType: WardrobeMediaType;
  detectedContentType: WardrobeMediaType | null;
  sizeBytes: number | null;
  quarantineKey: string;
  privateKey: string | null;
  status: WardrobeMediaStatus;
  scanner: string | null;
  scanReference: string | null;
  rejectionCode: MediaRejectionCode | null;
  createdAt: string;
  updatedAt: string;
}>;

export type InitiateWardrobeMedia = Readonly<{
  id: string;
  ownerId: string;
  wardrobeItemId: string;
  originalFilename: string;
  declaredContentType: WardrobeMediaType;
  now: Date;
}>;

function requireState(media: WardrobeMedia, allowed: readonly WardrobeMediaStatus[]): void {
  if (!allowed.includes(media.status)) {
    throw new Error(
      `Wardrobe media ${media.id} cannot transition from ${media.status}; expected ${allowed.join(
        " or ",
      )}.`,
    );
  }
}

function update(
  media: WardrobeMedia,
  changes: Partial<Omit<WardrobeMedia, "id" | "ownerId" | "wardrobeItemId" | "createdAt">>,
  now: Date,
): WardrobeMedia {
  return Object.freeze({
    ...media,
    ...changes,
    updatedAt: now.toISOString(),
  });
}

export function createWardrobeMedia(input: InitiateWardrobeMedia): WardrobeMedia {
  const originalFilename = input.originalFilename.trim();
  if (!originalFilename || originalFilename.length > 255) {
    throw new Error("Original filename must contain between 1 and 255 characters.");
  }

  if (!allowedWardrobeMediaTypes.includes(input.declaredContentType)) {
    throw new Error(`Unsupported declared media type: ${input.declaredContentType}`);
  }

  const timestamp = input.now.toISOString();

  return Object.freeze({
    id: input.id,
    ownerId: input.ownerId,
    wardrobeItemId: input.wardrobeItemId,
    originalFilename,
    declaredContentType: input.declaredContentType,
    detectedContentType: null,
    sizeBytes: null,
    quarantineKey: `quarantine/${input.id}`,
    privateKey: null,
    status: "initiated",
    scanner: null,
    scanReference: null,
    rejectionCode: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function markWardrobeMediaUploaded(
  media: WardrobeMedia,
  sizeBytes: number,
  now: Date,
): WardrobeMedia {
  requireState(media, ["initiated"]);

  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maximumWardrobeMediaBytes) {
    throw new Error(`Invalid uploaded media size: ${sizeBytes}`);
  }

  return update(media, { sizeBytes, status: "uploaded" }, now);
}

export function markWardrobeMediaScanning(media: WardrobeMedia, now: Date): WardrobeMedia {
  requireState(media, ["uploaded", "failed"]);
  return update(media, { status: "scanning", rejectionCode: null }, now);
}

export function markWardrobeMediaReady(
  media: WardrobeMedia,
  input: Readonly<{
    detectedContentType: WardrobeMediaType;
    privateKey: string;
    scanner: string;
    scanReference: string | null;
    now: Date;
  }>,
): WardrobeMedia {
  requireState(media, ["scanning"]);

  if (!allowedWardrobeMediaTypes.includes(input.detectedContentType)) {
    throw new Error(`Unsupported detected media type: ${input.detectedContentType}`);
  }

  if (!input.privateKey.startsWith("private/")) {
    throw new Error("Ready media must use the private object prefix.");
  }

  return update(
    media,
    {
      detectedContentType: input.detectedContentType,
      privateKey: input.privateKey,
      scanner: input.scanner,
      scanReference: input.scanReference,
      status: "ready",
      rejectionCode: null,
    },
    input.now,
  );
}

export function rejectWardrobeMedia(
  media: WardrobeMedia,
  input: Readonly<{
    code: MediaRejectionCode;
    detectedContentType?: WardrobeMediaType | null;
    scanner?: string | null;
    scanReference?: string | null;
    now: Date;
  }>,
): WardrobeMedia {
  requireState(media, ["initiated", "uploaded", "scanning", "failed"]);

  return update(
    media,
    {
      detectedContentType: input.detectedContentType ?? media.detectedContentType,
      scanner: input.scanner ?? media.scanner,
      scanReference: input.scanReference ?? media.scanReference,
      status: "rejected",
      rejectionCode: input.code,
    },
    input.now,
  );
}

export function failWardrobeMedia(
  media: WardrobeMedia,
  scanner: string | null,
  now: Date,
): WardrobeMedia {
  requireState(media, ["uploaded", "scanning"]);
  return update(media, { scanner, status: "failed" }, now);
}

export function deleteWardrobeMedia(media: WardrobeMedia, now: Date): WardrobeMedia {
  if (media.status === "deleted") {
    return media;
  }

  return update(media, { status: "deleted" }, now);
}
