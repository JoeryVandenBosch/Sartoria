import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { buildOwnerWardrobeInsights } from "@/modules/insights/application/build-owner-wardrobe-insights";
import type { UnderuseStatus } from "@/modules/insights/domain/wardrobe-insights";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import { wardrobeCategories } from "@/modules/wardrobe/domain/wardrobe-item";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wardrobe insights",
  description: "Private deterministic wardrobe coverage, usage, duplication, and wish-list impact.",
};

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function underuseLabel(value: UnderuseStatus): string {
  const labels: Record<UnderuseStatus, string> = {
    unavailable: "Wear history unavailable",
    "not-recorded": "Not recorded as worn",
    "light-use": "Lightly used",
    used: "Used",
  };
  return labels[value];
}

function money(amountMinor: number | null, currency: string | null | undefined): string {
  if (amountMinor === null || !currency) {
    return "Not available";
  }
  try {
    return new Intl.NumberFormat("en-BE", { style: "currency", currency }).format(
      amountMinor / 100,
    );
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function date(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }
  return new Intl.DateTimeFormat("en-BE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default async function InsightsPage() {
  const ownerId = await getCurrentUserId();
  const wardrobeRepository = getWardrobeRepository();
  const [wardrobe, insights] = await Promise.all([
    wardrobeRepository.listByOwner(ownerId),
    buildOwnerWardrobeInsights(ownerId, {
      wardrobeRepository,
      outfitRepository: getOutfitRepository(),
      wearEventRepository: getOutfitWearEventRepository(),
    }),
  ]);
  const items = new Map(wardrobe.map((item) => [item.id, item]));
  const totalItems =
    insights.ownership.owned + insights.ownership.wishList + insights.ownership.archived;

  return (
    <div className="page-frame insights-page">
      <header className="insights-hero">
        <div>
          <div className="eyebrow">Deterministic wardrobe intelligence</div>
          <h1>See the facts behind your wardrobe.</h1>
        </div>
        <div className="insights-hero-copy">
          <p>
            Coverage, duplication, outfit use, explicit wear, optional cost-per-wear, and wish-list
            impact are calculated from your private source records—without an AI provider.
          </p>
          <div className="profile-privacy-note">
            <strong>Calculated, not guessed.</strong>
            <span>Private notes, images, travel context, and hidden model scores are excluded.</span>
          </div>
        </div>
      </header>

      {totalItems === 0 ? (
        <section className="empty-state insights-empty-state">
          <span aria-hidden="true" className="empty-state-number">07</span>
          <div>
            <h2>No wardrobe facts yet.</h2>
            <p>Add owned or wish-list items before opening factual insights.</p>
            <Link className="button button-primary" href="/wardrobe">Open wardrobe</Link>
          </div>
        </section>
      ) : (
        <>
          <section aria-label="Wardrobe summary" className="insights-summary-grid">
            <article><span>Owned</span><strong>{insights.ownership.owned}</strong></article>
            <article><span>Wish list</span><strong>{insights.ownership.wishList}</strong></article>
            <article><span>Saved outfits</span><strong>{insights.totalOutfits}</strong></article>
            <article><span>Wear events</span><strong>{insights.totalWearEvents}</strong></article>
          </section>

          <section aria-labelledby="coverage-title" className="insights-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Broad functional coverage</div>
                <h2 id="coverage-title">What your owned wardrobe can cover.</h2>
              </div>
              <span className="item-count">
                {insights.functionalCoverage.filter((group) => group.status === "covered").length} of {insights.functionalCoverage.length} groups
              </span>
            </div>

            <div className="coverage-grid">
              {insights.functionalCoverage.map((group) => (
                <article className={`coverage-card coverage-card-${group.status}`} key={group.id}>
                  <span>{group.status === "covered" ? "Covered" : "Gap"}</span>
                  <h3>{group.label}</h3>
                  <p>{group.ownedCount} owned {group.ownedCount === 1 ? "item" : "items"}</p>
                  <small>{group.categories.map(label).join(" · ")}</small>
                </article>
              ))}
            </div>

            <div className="category-count-grid" aria-label="Owned item counts by category">
              {wardrobeCategories.map((category) => {
                const count = insights.categories.find((entry) => entry.category === category)?.ownedCount ?? 0;
                return (
                  <div key={category}>
                    <span>{label(category)}</span>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="duplication-title" className="insights-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Duplication signals</div>
                <h2 id="duplication-title">Where explicit facts overlap.</h2>
              </div>
              <span className="item-count">{insights.duplicateClusters.length} signals</span>
            </div>

            {insights.duplicateClusters.length === 0 ? (
              <div className="insight-unavailable">
                <h3>No duplicate signals detected.</h3>
                <p>Signals require at least two owned items with matching category and colour facts.</p>
              </div>
            ) : (
              <div className="duplicate-grid">
                {insights.duplicateClusters.map((cluster) => (
                  <article className="duplicate-card" key={`${cluster.kind}-${cluster.itemIds.join("-")}`}>
                    <div className="duplicate-card-meta">
                      <span>{label(cluster.kind)}</span>
                      <span>{cluster.itemIds.length} items</span>
                    </div>
                    <h3>{label(cluster.category)} · {label(cluster.normalizedColour)}</h3>
                    <ul>{cluster.matchingFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
                    <div className="insight-source-links">
                      {cluster.itemIds.map((itemId) => {
                        const item = items.get(itemId);
                        return item ? (
                          <Link href={`/wardrobe/${encodeURIComponent(item.id)}`} key={item.id}>
                            {item.name}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="usage-title" className="insights-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Outfit and wear facts</div>
                <h2 id="usage-title">How owned items appear in recorded use.</h2>
              </div>
              <span className="item-count">{insights.itemUsage.length} owned items</span>
            </div>

            <div className="insights-table-wrapper">
              <table className="insights-table">
                <caption>Owned item outfit membership, attributed wear, last-worn date, and optional cost-per-wear.</caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Outfits</th>
                    <th scope="col">Attributed wears</th>
                    <th scope="col">Last worn</th>
                    <th scope="col">Use signal</th>
                    <th scope="col">Cost per wear</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.itemUsage.map((usage) => {
                    const item = items.get(usage.itemId);
                    return item ? (
                      <tr key={usage.itemId}>
                        <th scope="row">
                          <Link href={`/wardrobe/${encodeURIComponent(item.id)}`}>{item.name}</Link>
                          <span>{label(item.category)} · {item.primaryColor}</span>
                        </th>
                        <td>{usage.outfitMembershipCount}</td>
                        <td>{usage.attributedWearCount}</td>
                        <td>{date(usage.lastWornOn)}</td>
                        <td><span className={`underuse-pill underuse-pill-${usage.underuseStatus}`}>{underuseLabel(usage.underuseStatus)}</span></td>
                        <td>{money(usage.costPerWearMinor, usage.costCurrency)}</td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="wishlist-title" className="insights-section">
            <div className="section-heading-row">
              <div>
                <div className="eyebrow">Wish-list purchase impact</div>
                <h2 id="wishlist-title">What each considered item would overlap.</h2>
              </div>
              <span className="item-count">{insights.wishListImpact.length} considered</span>
            </div>

            {insights.wishListImpact.length === 0 ? (
              <div className="insight-unavailable">
                <h3>No wish-list items recorded.</h3>
                <p>Add an item with status Wish list to compare it with owned coverage.</p>
              </div>
            ) : (
              <div className="wishlist-impact-grid">
                {insights.wishListImpact.map((impact) => {
                  const item = items.get(impact.itemId);
                  return item ? (
                    <article className="wishlist-impact-card" key={item.id}>
                      <div className="wishlist-impact-meta">
                        <span className={`risk-pill risk-pill-${impact.duplicationRisk}`}>
                          {label(impact.duplicationRisk)} duplication risk
                        </span>
                        <span>{impact.contributesToCoverageGap ? "Adds broad coverage" : "Existing group covered"}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.brand ?? "Brand not recorded"} · {item.primaryColor} · {label(item.category)}</p>
                      <dl>
                        <div><dt>Same category</dt><dd>{impact.sameCategoryOwnedCount}</dd></div>
                        <div><dt>Same colour</dt><dd>{impact.sameCategoryColourOwnedCount}</dd></div>
                        <div><dt>Exact signal</dt><dd>{impact.exactSignalOwnedCount}</dd></div>
                      </dl>
                      <p>{impact.explanation}</p>
                      <Link className="text-link text-link-dark" href={`/wardrobe/${encodeURIComponent(item.id)}`}>
                        Inspect wish-list item
                      </Link>
                    </article>
                  ) : null;
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="methodology-title" className="insights-methodology">
            <div>
              <div className="eyebrow">Methodology</div>
              <h2 id="methodology-title">What these numbers mean.</h2>
            </div>
            <ol>{insights.methodology.map((entry) => <li key={entry}>{entry}</li>)}</ol>
          </section>
        </>
      )}
    </div>
  );
}
