"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { allowedWardrobeMediaTypes } from "@/modules/media/domain/wardrobe-media";

import { uploadWardrobeImage } from "../upload-wardrobe-image";

export function MediaUploadForm({ wardrobeItemId }: Readonly<{ wardrobeItemId: string }>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage("Select an image first.");
      return;
    }

    setPending(true);

    const outcome = await uploadWardrobeImage(file, wardrobeItemId);

    setMessage(outcome.message);
    setPending(false);

    if (outcome.kind === "uploaded") {
      form.reset();
    }

    router.refresh();
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
