import { describe, expect, it } from "vitest";

import {
  createWardrobeMedia,
  deleteWardrobeMedia,
  markWardrobeMediaReady,
  markWardrobeMediaScanning,
  markWardrobeMediaUploaded,
  maximumWardrobeMediaBytes,
  rejectWardrobeMedia,
} from "@/modules/media/domain/wardrobe-media";

const createdAt = new Date("2026-07-25T12:00:00.000Z");

function initiated() {
  return createWardrobeMedia({
    id: "media-random-id",
    ownerId: "owner-private",
    wardrobeItemId: "item-private",
    originalFilename: "My Navy Blazer.jpg",
    declaredContentType: "image/jpeg",
    now: createdAt,
  });
}

describe("wardrobe media lifecycle", () => {
  it("uses opaque prefix keys without personal metadata", () => {
    const media = initiated();

    expect(media.quarantineKey).toBe("quarantine/media-random-id");
    expect(media.quarantineKey).not.toContain(media.ownerId);
    expect(media.quarantineKey).not.toContain(media.wardrobeItemId);
    expect(media.quarantineKey).not.toContain(media.originalFilename);
    expect(media.status).toBe("initiated");
  });

  it("enforces upload size and transition order", () => {
    const media = initiated();

    expect(() => markWardrobeMediaUploaded(media, 0, createdAt)).toThrow(
      "Invalid uploaded media size",
    );
    expect(() =>
      markWardrobeMediaUploaded(media, maximumWardrobeMediaBytes + 1, createdAt),
    ).toThrow("Invalid uploaded media size");

    const uploaded = markWardrobeMediaUploaded(media, 12_345, new Date("2026-07-25T12:01:00Z"));
    expect(uploaded.status).toBe("uploaded");
    expect(uploaded.sizeBytes).toBe(12_345);
    expect(() => markWardrobeMediaUploaded(uploaded, 12_345, createdAt)).toThrow(
      "cannot transition",
    );
  });

  it("requires scanning and a private prefix before ready", () => {
    const uploaded = markWardrobeMediaUploaded(initiated(), 12_345, createdAt);
    const scanning = markWardrobeMediaScanning(uploaded, createdAt);

    expect(() =>
      markWardrobeMediaReady(scanning, {
        detectedContentType: "image/jpeg",
        privateKey: "quarantine/media-random-id",
        scanner: "clamav",
        scanReference: null,
        now: createdAt,
      }),
    ).toThrow("private object prefix");

    const ready = markWardrobeMediaReady(scanning, {
      detectedContentType: "image/jpeg",
      privateKey: "private/media-random-id",
      scanner: "clamav",
      scanReference: null,
      now: createdAt,
    });

    expect(ready.status).toBe("ready");
    expect(ready.privateKey).toBe("private/media-random-id");
  });

  it("records a safe rejection code and makes deletion idempotent", () => {
    const rejected = rejectWardrobeMedia(initiated(), {
      code: "metadata-mismatch",
      now: createdAt,
    });
    const deleted = deleteWardrobeMedia(rejected, createdAt);

    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionCode).toBe("metadata-mismatch");
    expect(deleteWardrobeMedia(deleted, createdAt)).toBe(deleted);
  });
});
