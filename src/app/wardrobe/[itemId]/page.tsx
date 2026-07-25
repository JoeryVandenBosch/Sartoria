import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { listWardrobeMediaForOwner } from "@/modules/media/application/query-wardrobe-media";
import {
  getMediaObjectStore,
  getWardrobeMediaRepository,
} from "@/modules/media/infrastructure/media-services";
import type { WardrobeMediaType } from "@/modules/media/domain/wardrobe-media";
import { getWardrobeItemForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { MediaDeleteButton } from "./media-delete-button";
import { MediaUploadForm } from "./media-upload-form";

type WardrobeItemPageProps = Readonly<{
  params: Promise<{ itemId: string }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wardrobe item",
};

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function browserDisplayable(contentType: WardrobeMediaType | null): boolean {
  return contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp";
}

function acquisitionCost(amountMinor: number | null, currency: string | null): string {
  if (amountMinor === null || currency === null) {
    return "Not recorded";
  }
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export default async function WardrobeItemPage({ params }: WardrobeItemPageProps) {
  const { itemId } = await params;
  const ownerId = await getCurrentUserId();
  const item = await getWardrobeItemForOwner(itemId, ownerId, getWardrobeRepository());

  if (!item) {
    notFound();
  }

  const media = await listWardrobeMediaForOwner(item.id, ownerId, {
    mediaRepository: getWardrobeMediaRepository(),
    objectStore: getMediaObjectStore(),
    now: () => new Date(),
  });
  const cover = media.find(
    (view) =>
      view.media.status === "ready" &&
      Boolean(view.readUrl) &&
      browserDisplayable(view.media.detectedContentType),
  );

  return (
    <div className="page-frame item-detail-page">
      <Link className="back-link" href="/wardrobe">
        <span aria-hidden="true">←</span> Back to wardrobe
      </Link>

      <article className="item-detail-layout">
        <div className="item-detail-visual">
          {cover?.readUrl ? (
            // Short-lived, owner-authorised object-store URL. Next Image optimisation is intentionally bypassed.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${item.name} wardrobe item`} src={cover.readUrl} />
          ) : (
            <span aria-hidden="true">{item.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="item-detail-copy">
          <div className="eyebrow">{label(item.category)}</div>
          <h1>{item.name}</h1>
          <p className="item-brand">{item.brand ?? "Brand not recorded"}</p>

          <dl className="item-facts">
            <div>
              <dt>Primary colour</dt>
              <dd>{item.primaryColor}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{label(item.ownershipStatus)}</dd>
            </div>
            <div>
              <dt>Acquisition cost</dt>
              <dd>{acquisitionCost(item.acquisitionCostMinor, item.acquisitionCurrency)}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "long",
                  timeZone: "UTC",
                }).format(new Date(item.createdAt))}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="fit-notes-title" className="item-notes">
            <h2 id="fit-notes-title">Private fit notes</h2>
            <p>{item.fitNotes ?? "No fit notes recorded."}</p>
          </section>
        </div>
      </article>

      <section aria-labelledby="private-media-title" className="private-media-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Private gallery</div>
            <h2 id="private-media-title">Wardrobe images</h2>
          </div>
          <span className="item-count">
            {media.length} {media.length === 1 ? "image" : "images"}
          </span>
        </div>

        {media.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">02</span>
            <div>
              <h3>No private images yet.</h3>
              <p>Add an original image below. Sartoria will keep it quarantined until validation completes.</p>
            </div>
          </div>
        ) : (
          <div className="media-grid">
            {media.map((view) => (
              <article className="media-card" key={view.media.id}>
                <div className="media-card-preview">
                  {view.readUrl && browserDisplayable(view.media.detectedContentType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={`${item.name} private wardrobe image`} src={view.readUrl} />
                  ) : (
                    <span>{label(view.media.status)}</span>
                  )}
                </div>
                <div className="media-card-copy">
                  <div>
                    <span className={`media-status media-status-${view.media.status}`}>
                      {label(view.media.status)}
                    </span>
                    <p>{view.media.originalFilename}</p>
                    {view.media.status === "ready" &&
                    !browserDisplayable(view.media.detectedContentType) ? (
                      <small>Securely stored. Browser display conversion is planned.</small>
                    ) : null}
                    {view.media.status === "rejected" ? (
                      <small>The upload did not pass secure validation.</small>
                    ) : null}
                  </div>
                  <MediaDeleteButton mediaId={view.media.id} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <MediaUploadForm wardrobeItemId={item.id} />
    </div>
  );
}
