"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WearEventDeleteButton({ eventId }: Readonly<{ eventId: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    if (!window.confirm("Remove this private wear record?")) {
      return;
    }

    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/outfit-wear-events/${encodeURIComponent(eventId)}`,
        { method: "DELETE" },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error("Sartoria could not remove the wear record.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The wear record could not be removed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="wear-event-delete-control">
      <button className="wear-event-delete-button" disabled={pending} onClick={remove} type="button">
        {pending ? "Removing…" : "Remove record"}
      </button>
      {message ? (
        <p aria-live="polite" className="field-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
