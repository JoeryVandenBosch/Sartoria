import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getRecommendationForOwner } from "@/modules/recommendations/application/query-recommendations";
import { isRecommendationExpired } from "@/modules/recommendations/domain/wardrobe-recommendation";
import { getRecommendationRepository } from "@/modules/recommendations/infrastructure/recommendation-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { RecommendationFeedbackControls } from "./recommendation-feedback-controls";

type RecommendationPageProps = Readonly<{
  params: Promise<{ recommendationId: string }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recommendation",
};

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fallbackReason(value: string | null): string {
  const reasons: Record<string, string> = {
    "provider-not-configured": "No provider was configured, so Sartoria used deterministic wardrobe logic.",
    "provider-failed": "The configured provider failed or timed out, so Sartoria used deterministic wardrobe logic.",
    "provider-output-invalid": "The provider response failed the structured-output schema, so Sartoria used deterministic wardrobe logic.",
    "provider-reference-invalid": "The provider referenced an unavailable item, so Sartoria used deterministic wardrobe logic.",
    "provider-confidence-low": "The provider confidence was too low, so Sartoria used deterministic wardrobe logic.",
  };
  return value ? reasons[value] ?? "Sartoria used deterministic wardrobe logic." : "";
}

export default async function RecommendationPage({ params }: RecommendationPageProps) {
  const { recommendationId } = await params;
  const ownerId = await getCurrentUserId();
  const recommendation = await getRecommendationForOwner(
    recommendationId,
    ownerId,
    getRecommendationRepository(),
  );
  if (!recommendation) {
    notFound();
  }

  const wardrobe = await getWardrobeRepository().listByOwner(ownerId);
  const items = new Map(wardrobe.map((item) => [item.id, item]));
  const expired = isRecommendationExpired(recommendation, new Date());

  return (
    <div className="page-frame recommendation-detail-page">
      <Link className="back-link" href="/recommendations">
        <span aria-hidden="true">←</span> Back to recommendations
      </Link>

      <header className="recommendation-detail-hero">
        <div>
          <div className="eyebrow">{recommendation.request.occasion}</div>
          <h1>{recommendation.summary}</h1>
          {recommendation.request.notes ? (
            <p className="recommendation-private-request">
              <strong>Your private context:</strong> {recommendation.request.notes}
            </p>
          ) : null}
        </div>
        <aside className="recommendation-evidence-card" aria-label="Recommendation evidence">
          <div className={`recommendation-origin recommendation-origin-${recommendation.provenance.kind}`}>
            {recommendation.provenance.kind === "provider" ? "Provider result" : "Deterministic fallback"}
          </div>
          <dl>
            <div>
              <dt>Confidence</dt>
              <dd>{titleCase(recommendation.confidence)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{expired ? "Expired" : titleCase(recommendation.status)}</dd>
            </div>
            <div>
              <dt>Schema</dt>
              <dd>v{recommendation.provenance.schemaVersion}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {recommendation.provenance.kind === "provider"
                  ? [recommendation.provenance.provider, recommendation.provenance.model]
                      .filter(Boolean)
                      .join(" · ")
                  : "Sartoria rules"}
              </dd>
            </div>
          </dl>
          {recommendation.provenance.kind === "fallback" ? (
            <p>{fallbackReason(recommendation.provenance.reasonCode)}</p>
          ) : (
            <p>Provider output passed schema, ownership, availability, duplication, and confidence checks.</p>
          )}
        </aside>
      </header>

      <section aria-labelledby="recommendation-items-title" className="recommendation-items-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Owned-item evidence</div>
            <h2 id="recommendation-items-title">Why these pieces.</h2>
          </div>
          <span className="item-count">{recommendation.itemReasons.length} items</span>
        </div>

        <div className="recommendation-item-grid">
          {recommendation.itemReasons.map((itemReason, index) => {
            const item = items.get(itemReason.itemId);
            return (
              <article className="recommendation-item-card" key={itemReason.itemId}>
                <span aria-hidden="true" className="recommendation-item-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="eyebrow">{item ? titleCase(item.category) : "Unavailable item"}</div>
                  <h3>{item?.name ?? "Wardrobe item no longer available"}</h3>
                  {item ? (
                    <p className="recommendation-item-facts">
                      {item.brand ?? "Brand not recorded"} · {item.primaryColor}
                    </p>
                  ) : null}
                  <p>{itemReason.reason}</p>
                  {item ? (
                    <Link
                      className="text-link text-link-dark"
                      href={`/wardrobe/${encodeURIComponent(item.id)}`}
                    >
                      Inspect wardrobe item
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recommendation-constraints-title" className="recommendation-constraints">
        <div>
          <div className="eyebrow">Applied constraints</div>
          <h2 id="recommendation-constraints-title">What was kept out.</h2>
        </div>
        {recommendation.exclusions.length === 0 ? (
          <p>No explicit exclusions were needed for this result.</p>
        ) : (
          <ul>
            {recommendation.exclusions.map((exclusion) => (
              <li key={exclusion}>{exclusion}</li>
            ))}
          </ul>
        )}
      </section>

      {recommendation.correction || recommendation.rejectionReason ? (
        <section aria-labelledby="recommendation-feedback-title" className="recommendation-saved-feedback">
          <div className="eyebrow">Saved private feedback</div>
          <h2 id="recommendation-feedback-title">Your recorded response.</h2>
          {recommendation.correction ? (
            <p><strong>Correction:</strong> {recommendation.correction}</p>
          ) : null}
          {recommendation.status === "rejected" ? (
            <p><strong>Rejected:</strong> {recommendation.rejectionReason ?? "No reason recorded."}</p>
          ) : null}
        </section>
      ) : null}

      <RecommendationFeedbackControls
        key={recommendation.revision}
        recommendationId={recommendation.id}
        rejected={recommendation.status === "rejected"}
        revision={recommendation.revision}
      />
    </div>
  );
}
