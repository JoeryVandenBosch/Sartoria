"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import {
  allowedWardrobeMediaTypes,
  maximumWardrobeMediaBytes,
} from "@/modules/media/domain/wardrobe-media";

type InitiationResponse = Readonly<{
  mediaId: string;
  policy: Readonly<{
    url: string;
    fields: Readonly<Record<string, string>>;
    expiresAt: string;
    maximumBytes: number;
  }>;
}>;

export function MediaUploadForm({ wardrobeItemId }: Readonly<{ wardrobeItemId: string }>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage("Select an image first.");
      return;
    }

    if (!allowedWardrobeMediaTypes.includes(file.type as never)) {
      setMessage("Choose a JPEG, PNG, WebP, HEIC, or HEIF image.");
      return;
    }

    if (file.size < 1 || file.size > maximumWardrobeMediaBytes) {
      setMessage("The image must be smaller than 20 MiB.");
      return;
    }

    setPending(true);

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
        throw new Error("Sartoria could not prepare the private upload.");
      }

      const upload = (await initiation.json()) as InitiationResponse;
      const formData = new FormData();
      for (const [field, value] of Object.entries(upload.policy.fields)) {
        formData.append(field, value);
      }
      formData.append("file", file);

      const stored = await fetch(upload.policy.url, {
        method: "POST",
        body: formData,
      });

      if (!stored.ok) {
        throw new Error("The image could not be stored in quarantine.");
      }

      const completed = await fetch(`/api/media/${encodeURIComponent(upload.mediaId)}/complete`, {
        method: "POST",
      });

      if (!completed.ok && completed.status !== 422) {
        throw new Error("Sartoria could not verify the uploaded image.");
      }

      const result = (await completed.json()) as {
        status: string;
        rejectionCode: string | null;
      };

      if (result.rejectionCode) {
        setMessage("The image was rejected during secure validation.");
      } else {
        setMessage(
          result.status === "uploaded"
            ? "Upload complete. Secure scanning is in progress."
            : "Image processed successfully.",
        );
      }

      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The private upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="media-upload-form" onSubmit={submit}>
      <div>
        <div className="eyebrow">Private imagery</div>
        <h2>Add a wardrobe image.</h2>
        <p>
          Images enter quarantine, are validated and scanned, and stay private. Accepted originals
          are limited to 20 MiB.
        </p>
      </div>

      <div className="media-upload-controls">
        <label className="file-field" htmlFor="wardrobe-media-file">
          <span>Select image</span>
          <input
            accept={allowedWardrobeMediaTypes.join(",")}
            id="wardrobe-media-file"
            name="file"
            ref={inputRef}
            required
            type="file"
          />
        </label>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Securing image…" : "Upload privately"}
        </button>
      </div>

      {message ? (
        <p aria-live="polite" className="media-upload-message" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
