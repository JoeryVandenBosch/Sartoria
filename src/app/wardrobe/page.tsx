import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { listWardrobeItemsForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { WardrobeItemForm } from "./wardrobe-item-form";

export const metadata: Metadata = {
  title: "Wardrobe",
};

function categoryLabel(category: string): string {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function WardrobePage() {
  const ownerId = await getCurrentUserId();
  const items = await listWardrobeItemsForOwner(ownerId, getWardrobeRepository());

  return (
    <div className="page-frame wardrobe-page">
      <section className="wardrobe-intro">
        <div>
          <div className="eyebrow">Your private wardrobe</div>
          <h1>What you own, clearly.</h1>
        </div>
        <p>
          Record reliable wardrobe facts first. Sartoria will use them later for outfits, packing,
          insights, and explainable recommendations.
        </p>
      </section>

      <section aria-labelledby="wardrobe-list-title" className="wardrobe-list-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Collection</div>
            <h2 id="wardrobe-list-title">Wardrobe items</h2>
          </div>
          <span className="item-count">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">
              01
            </span>
            <div>
              <h3>Your wardrobe begins with one reliable item.</h3>
              <p>
                Add a garment, pair of shoes, or accessory below. AI is not required for this
                workflow.
              </p>
            </div>
          </div>
        ) : (
          <div className="wardrobe-grid">
            {items.map((item) => (
              <article className="wardrobe-card" key={item.id}>
                <div className="wardrobe-card-visual" aria-hidden="true">
                  <span>{item.name.slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="wardrobe-card-copy">
                  <div className="wardrobe-card-meta">
                    <span>{categoryLabel(item.category)}</span>
                    <span>{item.primaryColor}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.brand ?? "Brand not recorded"}</p>
                  <Link className="text-link text-link-dark" href={`/wardrobe/${item.id}`}>
                    View item <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Add a wardrobe item">
        <WardrobeItemForm />
      </section>
    </div>
  );
}
