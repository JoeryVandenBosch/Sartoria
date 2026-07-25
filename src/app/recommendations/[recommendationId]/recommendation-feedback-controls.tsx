"use client";

import { useActionState } from "react";

import {
  correctRecommendationAction,
  deleteRecommendationAction,
  rejectRecommendationAction,
} from "../actions";
import { initialRecommendationFeedbackState } from "../feedback-state";

export function RecommendationFeedbackControls({
  recommendationId,
  revision,
  rejected,
}: Readonly<{
  recommendationId: string;
  revision: number;
  rejected: boolean;
}>) {
  const [correctionState, correctionAction, correcting] = useActionState(
    correctRecommendationAction,
    initialRecommendationFeedbackState,
  );
  const [rejectionState, rejectionAction, rejecting] = useActionState(
    rejectRecommendationAction,
    initialRecommendationFeedbackState,
  );

  return (
    <section aria-labelledby="recommendation-control-title" className="recommendation-controls">
      <div className="recommendation-control-heading">
        <div className="eyebrow">Your control</div>
        <h2 id="recommendation-control-title">Correct, reject, or remove it.</h2>
        <p>
          Feedback stays private. It is not silently added to a later provider request and can be
          deleted with the recommendation.
        </p>
      </div>

      <div className="recommendation-control-grid">
        <form action={correctionAction} className="recommendation-feedback-form">
          <input name="recommendationId" type="hidden" value={recommendationId} />
          <input name="expectedRevision" type="hidden" value={revision} />
          <div className="field">
            <label htmlFor="recommendation-correction">Record a correction</label>
            <textarea
              id="recommendation-correction"
              maxLength={600}
              name="correction"
              placeholder="For example: I would prefer the navy trousers instead of denim."
              required
              rows={4}
            />
          </div>
          <button className="button button-secondary" disabled={correcting} type="submit">
            {correcting ? "Saving…" : "Save correction"}
          </button>
          {correctionState.status !== "idle" ? (
            <p
              aria-live="polite"
              className={`form-message form-message-${correctionState.status}`}
              role={correctionState.status === "error" ? "alert" : "status"}
            >
              {correctionState.message}
            </p>
          ) : null}
        </form>

        <form action={rejectionAction} className="recommendation-feedback-form">
          <input name="recommendationId" type="hidden" value={recommendationId} />
          <input name="expectedRevision" type="hidden" value={revision} />
          <div className="field">
            <label htmlFor="recommendation-rejection">Reject this recommendation</label>
            <textarea
              id="recommendation-rejection"
              maxLength={500}
              name="reason"
              placeholder="Optional private reason"
              rows={4}
            />
          </div>
          <button className="button button-secondary" disabled={rejecting || rejected} type="submit">
            {rejected ? "Already rejected" : rejecting ? "Rejecting…" : "Reject recommendation"}
          </button>
          {rejectionState.status !== "idle" ? (
            <p
              aria-live="polite"
              className={`form-message form-message-${rejectionState.status}`}
              role={rejectionState.status === "error" ? "alert" : "status"}
            >
              {rejectionState.message}
            </p>
          ) : null}
        </form>
      </div>

      <form action={deleteRecommendationAction} className="recommendation-delete-form">
        <input name="recommendationId" type="hidden" value={recommendationId} />
        <div>
          <strong>Delete this private record</strong>
          <span>The recommendation, correction, and rejection reason are removed together.</span>
        </div>
        <button className="danger-button" type="submit">Delete recommendation</button>
      </form>
    </section>
  );
}
