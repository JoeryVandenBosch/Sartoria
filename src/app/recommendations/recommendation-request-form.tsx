"use client";

import { useActionState } from "react";

import { generateRecommendationAction } from "./actions";
import { initialRecommendationFormState } from "./form-state";

export function RecommendationRequestForm() {
  const [state, action, pending] = useActionState(
    generateRecommendationAction,
    initialRecommendationFormState,
  );

  return (
    <form action={action} className="recommendation-request-form">
      <div className="recommendation-request-heading">
        <div>
          <div className="eyebrow">Explicit request</div>
          <h2>What are you dressing for?</h2>
        </div>
        <p>
          Sartoria uses only your owned wardrobe, saved looks, private profile controls, and this
          request. Provider failure falls back to deterministic wardrobe logic.
        </p>
      </div>

      {state.status === "error" ? (
        <div aria-live="polite" className="form-message form-message-error" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="recommendation-request-grid">
        <div className="field">
          <label htmlFor="recommendation-occasion">Occasion or purpose</label>
          <input
            aria-describedby="recommendation-occasion-hint"
            id="recommendation-occasion"
            maxLength={120}
            name="occasion"
            placeholder="Dinner, client meeting, relaxed weekend…"
            required
          />
          <span className="field-hint" id="recommendation-occasion-hint">
            Keep it broad. Precise location and calendar access are not required.
          </span>
          {state.fieldErrors.occasion?.[0] ? (
            <span className="field-error">{state.fieldErrors.occasion[0]}</span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="recommendation-notes">Optional context</label>
          <textarea
            id="recommendation-notes"
            maxLength={500}
            name="notes"
            placeholder="Weather range, desired formality, comfort preference…"
            rows={4}
          />
          <span className="field-hint">Maximum 500 characters. Do not include secrets.</span>
          {state.fieldErrors.notes?.[0] ? (
            <span className="field-error">{state.fieldErrors.notes[0]}</span>
          ) : null}
        </div>
      </div>

      <div className="recommendation-request-footer">
        <span>Every result remains private, grounded, correctable, rejectable, and deletable.</span>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Composing…" : "Recommend from my wardrobe"}
        </button>
      </div>
    </form>
  );
}
