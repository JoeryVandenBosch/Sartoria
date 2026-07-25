"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileResetButton({ revision }: Readonly<{ revision: number }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function reset() {
    if (
      !window.confirm(
        "Reset your private style profile? Your wardrobe and images will not be deleted.",
      )
    ) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });

      if (response.status === 409) {
        setMessage("The profile changed in another session. Reload before resetting it.");
        return;
      }

      if (!response.ok && response.status !== 404) {
        throw new Error("Sartoria could not reset the style profile.");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The profile could not be reset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="profile-reset-control">
      <button className="profile-reset-button" disabled={pending} onClick={reset} type="button">
        {pending ? "Resetting…" : "Reset profile"}
      </button>
      {message ? (
        <p aria-live="polite" className="field-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
