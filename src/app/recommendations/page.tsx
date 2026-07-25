import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { listRecommendationsForOwner } from "@/modules/recommendations/application/query-recommendations";
import { isRecommendationExpired } from "@/modules/recommendations/domain/wardrobe-recommendation";
import { getRecommendationRepository } from "@/modules/recommendations/infrastructure/recommendation-repository";

import { RecommendationRequestForm } from "./recommendation-request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recommendations",
  description: "Private, explainable recommendations grounded in your owned wardrobe.",
};

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function RecommendationsPage() {
  const ownerId = await getCurrentUserId();
  const recommendations = await listRecommendationsForOwner(
    ownerId,
    getRecommendationRepository(),
  );
  const now = new Date();

  return (
    <div className="page-frame recommendations-page">
      <header className="recommendations-hero">
        <div>
          <div className="eyebrow">Explainable wardrobe intelligence</div>
          <h1>Advice you can inspect.</h1>
        </div>
        <div className="recommendations-hero-copy">
          <p>
            Each recommendation references the exact items it uses, states its constraints and
            confidence, and tells you whether it came from a configured provider or deterministic
            Sartoria logic.
          </p>
          <div className="profile-privacy-note">
            <strong>No hidden reasoning.</strong>
            <span>Only concise user-facing explanations and provider-neutral provenance are saved.</span>
          </div>
        </div>
      </header>

      <RecommendationRequestForm />

      <section aria-labelledby="recommendation-history-title" className="recommendation-history">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Private history</div>
            <h2 id="recommendation-history-title">Saved recommendations</h2>
          </div>
          <span className="item-count">
            {recommendations.length} {recommendations.length === 1 ? "result" : "results"}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">05</span>
            <div>
              <h3>No recommendations yet.</h3>
              <p>Make an explicit request above after recording at least two owned wardrobe items.</p>
            </div>
          </div>
        ) : (
          <div className="recommendation-card-grid">
            {recommendations.map((recommendation) => {
              const expired = isRecommendationExpired(recommendation, now);
              return (
                <article className="recommendation-card" key={recommendation.id}>
                  <div className="recommendation-card-meta">
                    <span className={`recommendation-origin recommendation-origin-${recommendation.provenance.kind}`}>
                      {recommendation.provenance.kind === "fallback" ? "Deterministic fallback" : "Provider result"}
                    </span>
                    <span>{titleCase(recommendation.confidence)} confidence</span>
                  </div>
                  <h3>{recommendation.request.occasion}</h3>
                  <p>{recommendation.summary}</p>
                  <dl>
                    <div>
                      <dt>Items</dt>
                      <dd>{recommendation.itemReasons.length}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{expired ? "Expired" : titleCase(recommendation.status)}</dd>
                    </div>
                  </dl>
                  <Link
                    aria-label={`Open recommendation for ${recommendation.request.occasion}`}
                    className="text-link text-link-dark"
                    href={`/recommendations/${encodeURIComponent(recommendation.id)}`}
                  >
                    Inspect recommendation
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
