import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getOutfitWearHistoryForOwner } from "@/modules/outfits/application/query-outfit-wear";
import { getOutfitForOwner } from "@/modules/outfits/application/query-outfits";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { getOutfitWearEventRepository } from "@/modules/outfits/infrastructure/outfit-wear-event-repository";
import { listWardrobeItemsForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { OutfitDeleteButton } from "./outfit-delete-button";
import { OutfitEditForm } from "./outfit-edit-form";
import { WearEventDeleteButton } from "./wear-event-delete-button";
import { WearEventForm } from "./wear-event-form";

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export default async function OutfitDetailPage({ params }: OutfitDetailPageProps) {
  const { outfitId } = await params;
  const ownerId = await getCurrentUserId();
  const outfitRepository = getOutfitRepository();
  const outfit = await getOutfitForOwner(outfitId, ownerId, outfitRepository);

  if (!outfit) {
    notFound();
  }

  const wardrobeRepository = getWardrobeRepository();
  const [items, wardrobeItems, wearHistory] = await Promise.all([
    Promise.all(
      outfit.wardrobeItemIds.map((itemId) =>
        wardrobeRepository.findByIdForOwner(itemId, ownerId),
      ),
    ),
    listWardrobeItemsForOwner(ownerId, wardrobeRepository),
    getOutfitWearHistoryForOwner(
      outfit.id,
      ownerId,
      getOutfitWearEventRepository(),
    ),
  ]);
  const today = new Date().toISOString().slice(0, 10);

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
            <dt>Wears</dt>
            <dd>{wearHistory.wearCount}</dd>
          </div>
          <div>
            <dt>Last worn</dt>
            <dd>{wearHistory.lastWornOn ? formatDate(wearHistory.lastWornOn) : "Not recorded"}</dd>
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
                    {item.ownershipStatus === "archived" ? <span>Archived</span> : null}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.brand ?? "Brand not recorded"}</p>
                </div>
                <Link className="text-link text-link-dark" href={`/wardrobe/${item.id}`}>
                  View item <span aria-hidden="true">→</span>
                </Link>
              </article>
            ) : (
              <article
                className="outfit-piece outfit-piece-unavailable"
                key={outfit.wardrobeItemIds[index]}
              >
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

      <section aria-labelledby="wear-history-title" className="wear-history-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Private history</div>
            <h2 id="wear-history-title">Worn by you</h2>
          </div>
          <span className="item-count">
            {wearHistory.wearCount} {wearHistory.wearCount === 1 ? "wear" : "wears"}
          </span>
        </div>

        <WearEventForm outfitId={outfit.id} today={today} />

        {wearHistory.events.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">00</span>
            <div>
              <h3>No wear history recorded.</h3>
              <p>Sartoria records nothing automatically. Add only the moments you want to remember.</p>
            </div>
          </div>
        ) : (
          <div className="wear-event-list">
            {wearHistory.events.map((event) => (
              <article className="wear-event-card" key={event.id}>
                <time dateTime={event.wornOn}>{formatDate(event.wornOn)}</time>
                <p>{event.note ?? "No private note recorded."}</p>
                <WearEventDeleteButton eventId={event.id} />
              </article>
            ))}
          </div>
        )}
      </section>

      <details className="outfit-edit-disclosure">
        <summary>Edit outfit revision {outfit.revision}</summary>
        <OutfitEditForm key={outfit.revision} outfit={outfit} items={wardrobeItems} />
      </details>

      <section aria-labelledby="outfit-danger-title" className="outfit-danger-zone">
        <div>
          <div className="eyebrow">Private data control</div>
          <h2 id="outfit-danger-title">Delete this outfit</h2>
          <p>Deletes the composition and all wear history. Wardrobe items and images remain.</p>
        </div>
        <OutfitDeleteButton outfitId={outfit.id} revision={outfit.revision} />
      </section>
    </div>
  );
}
