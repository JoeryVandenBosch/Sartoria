"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MediaDeleteButton({ mediaId }: Readonly<{ mediaId: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("Remove this private image from Sartoria?")) {
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(mediaId)}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error("Deletion failed.");
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="media-delete-button" disabled={pending} onClick={remove} type="button">
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
