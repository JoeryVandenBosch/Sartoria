"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OutfitDeleteButton({
  outfitId,
  revision,
}: Readonly<{
  outfitId: string;
  revision: number;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (
      !window.confirm(
        "Delete this private outfit and all of its wear history? Wardrobe items and images will remain.",
      )
    ) {
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });

      if (response.status === 409) {
        setMessage("The outfit changed in another session. Reload before deleting it.");
        return;
      }
      if (!response.ok && response.status !== 404) {
        throw new Error("Sartoria could not delete the private outfit.");
      }

      router.push("/outfits");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The outfit could not be deleted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="outfit-delete-control">
      <button className="outfit-danger-button" disabled={pending} onClick={remove} type="button">
        {pending ? "Deleting…" : "Delete outfit"}
      </button>
      {message ? (
        <p aria-live="polite" className="field-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
