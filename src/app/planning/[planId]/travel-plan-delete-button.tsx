"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TravelPlanDeleteButton({
  planId,
  revision,
}: Readonly<{ planId: string; revision: number }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm("Delete this private travel plan and its packing list?")) {
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/planning/${encodeURIComponent(planId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Sartoria could not delete the travel plan.");
      }
      router.push("/planning");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The travel plan could not be deleted.");
      setPending(false);
    }
  }

  return (
    <div className="travel-delete-control">
      <button className="danger-button" disabled={pending} onClick={remove} type="button">
        {pending ? "Deleting…" : "Delete travel plan"}
      </button>
      {message ? <p aria-live="polite" role="alert">{message}</p> : null}
    </div>
  );
}
