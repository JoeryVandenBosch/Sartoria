"use client";

import {
  allowedWardrobeMediaTypes,
  maximumWardrobeMediaBytes,
  type WardrobeMediaType,
} from "@/modules/media/domain/wardrobe-media";

/**
 * Shared client-side upload sequence for wardrobe imagery.
 *
 * Extracted so the item detail page and the creation form run exactly the same
 * three steps — initiate, store in quarantine, complete — rather than
 * maintaining two copies that could drift apart. The quarantine-first pipeline
 * itself is unchanged: this only calls the existing endpoints.
 *
 * The file is never sent through a server action. It goes directly to object
 * storage using a short-lived policy, which keeps large originals off the
 * application request path.
 */

type InitiationResponse = Readonly<{
  mediaId: string;
  policy: Readonly<{
    url: string;
    fields: Readonly<Record<string, string>>;
    expiresAt: string;
    maximumBytes: number;
  }>;
}>;

export type UploadOutcome =
  | { readonly kind: "uploaded"; readonly message: string }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Validates a candidate file before any network request.
 *
 * This is a convenience for the person using the form, not a security control.
 * The authoritative checks remain server-side: declared content type is
 * verified against detected content type, and the object is malware-scanned in
 * quarantine before promotion.
 */
export function describeUnacceptableFile(file: File): string | undefined {
  if (!allowedWardrobeMediaTypes.includes(file.type as WardrobeMediaType)) {
    return "Choose a JPEG, PNG, WebP, HEIC, or HEIF image.";
  }

  if (file.size < 1 || file.size > maximumWardrobeMediaBytes) {
    return "The image must be smaller than 20 MiB.";
  }

  return undefined;
}

export async function uploadWardrobeImage(
  file: File,
  wardrobeItemId: string,
): Promise<UploadOutcome> {
  const unacceptable = describeUnacceptableFile(file);
  if (unacceptable) {
    return { kind: "failed", message: unacceptable };
  }

  try {
    const initiation = await fetch("/api/media/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wardrobeItemId,
        originalFilename: file.name,
        declaredContentType: file.type,
        sizeBytes: file.size,
      }),
    });

    if (!initiation.ok) {
      return { kind: "failed", message: "Sartoria could not prepare the private upload." };
    }

    const upload = (await initiation.json()) as InitiationResponse;
    const formData = new FormData();
    for (const [field, value] of Object.entries(upload.policy.fields)) {
      formData.append(field, value);
    }
    formData.append("file", file);

    const stored = await fetch(upload.policy.url, { method: "POST", body: formData });

    if (!stored.ok) {
      return { kind: "failed", message: "The image could not be stored in quarantine." };
    }

    const completed = await fetch(`/api/media/${encodeURIComponent(upload.mediaId)}/complete`, {
      method: "POST",
    });

    if (!completed.ok && completed.status !== 422) {
      return { kind: "failed", message: "Sartoria could not verify the uploaded image." };
    }

    const result = (await completed.json()) as {
      status: string;
      rejectionCode: string | null;
    };

    if (result.rejectionCode) {
      return { kind: "rejected", message: "The image was rejected during secure validation." };
    }

    return {
      kind: "uploaded",
      message:
        result.status === "uploaded"
          ? "Upload complete. Secure scanning is in progress."
          : "Image processed successfully.",
    };
  } catch {
    // The reason is deliberately not surfaced: a network or storage error can
    // carry endpoint detail that does not belong in the interface.
    return { kind: "failed", message: "The private upload failed." };
  }
}
