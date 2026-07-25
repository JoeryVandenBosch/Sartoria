import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOutfitForOwner } from "@/modules/outfits/application/query-outfits";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Outfit detail",
};

type OutfitDetailPageProps = Readonly<{
  params: Promise<{ outfitId: string }>;
}>;

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OutfitDetailPage({ params }: OutfitDetailPageProps) {
  const { outfitId } = await params;
  const ownerId = await getCurrentUserId();
  const outfit = await getOutfitForOwner(outfitId, ownerId, getOutfitRepository());

  if (!outfit) {
    notFound();
  }

  const wardrobeRepository = getWardrobeRepository();
  const items = await Promise.all(
    outfit.wardrobeItemIds.map((itemId) =>
      wardrobeRepository.findByIdForOwner(itemId, ownerId),
    ),
  );

  return (
    <div className="page-frame outfit-detail-page">
      <Link className="back-link" href="/outfits">
        <span aria-hidden="true">←</span> Back to outfits
      </Link>

      <header className="outfit-detail-hero">
        <div>
          <div className="eyebrow">{outfit.occasion ?? "Private outfit"}</div>
          <h1>{outfit.name}</h1>
        </div>
        <dl className="outfit-detail-facts">
          <div>
            <dt>Pieces</dt>
            <dd>{outfit.wardrobeItemIds.length}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{outfit.revision}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(outfit.updatedAt))}
            </dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="outfit-pieces-title" className="outfit-pieces-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Composition</div>
            <h2 id="outfit-pieces-title">The pieces</h2>
          </div>
          <span className="item-count">Manual composition</span>
        </div>

        <div className="outfit-piece-list">
          {items.map((item, index) =>
            item ? (
              <article className="outfit-piece" key={item.id}>
                <span className="outfit-piece-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="outfit-piece-visual" aria-hidden="true">
                  {item.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="outfit-piece-copy">
                  <div className="outfit-card-meta">
                    <span>{label(item.category)}</span>
                    <span>{item.primaryColor}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.brand ?? "Brand not recorded"}</p>
                </div>
                <Link className="text-link text-link-dark" href={`/wardrobe/${item.id}`}>
                  View item <span aria-hidden="true">→</span>
                </Link>
              </article>
            ) : (
              <article className="outfit-piece outfit-piece-unavailable" key={outfit.wardrobeItemIds[index]}>
                <span className="outfit-piece-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="outfit-piece-copy">
                  <h3>Wardrobe item unavailable</h3>
                  <p>This private reference can no longer be displayed.</p>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="outfit-notes-title" className="outfit-notes-panel">
        <div>
          <div className="eyebrow">Private notes</div>
          <h2 id="outfit-notes-title">Why this look works</h2>
        </div>
        <p>{outfit.stylingNotes ?? "No private styling notes recorded."}</p>
      </section>
    </div>
  );
}
