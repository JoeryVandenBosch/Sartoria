"use client";

import { useActionState } from "react";

import { recordWearEventAction } from "./actions";
import { initialOutfitLifecycleFormState, type OutfitLifecycleFormState } from "./form-state";

function fieldError(state: OutfitLifecycleFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

export function WearEventForm({
  outfitId,
  today,
}: Readonly<{
  outfitId: string;
  today: string;
}>) {
  const action = recordWearEventAction.bind(null, outfitId);
  const [state, formAction, pending] = useActionState(action, initialOutfitLifecycleFormState);

  return (
    <form action={formAction} className="wear-event-form">
      <div>
        <div className="eyebrow">Explicit history</div>
        <h2>Record a wear.</h2>
        <p>Date-only and private. Sartoria never creates wear history automatically.</p>
      </div>

      <div className="wear-event-fields">
        <div className="field">
          <label htmlFor="wear-event-date">Date worn</label>
          <input
            defaultValue={today}
            id="wear-event-date"
            max={today}
            min="1900-01-01"
            name="wornOn"
            required
            type="date"
          />
          {fieldError(state, "wornOn") ? (
            <span className="field-error">{fieldError(state, "wornOn")}</span>
          ) : null}
        </div>

        <div className="field wear-event-note-field">
          <label htmlFor="wear-event-note">Private note</label>
          <textarea
            id="wear-event-note"
            maxLength={500}
            name="note"
            placeholder="Optional context you want to remember"
            rows={3}
          />
          {fieldError(state, "note") ? (
            <span className="field-error">{fieldError(state, "note")}</span>
          ) : null}
        </div>

        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Recording…" : "Record private wear"}
        </button>
      </div>

      {state.status !== "idle" ? (
        <p
          aria-live="polite"
          className={`form-message form-message-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
