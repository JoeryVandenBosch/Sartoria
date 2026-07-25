import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDevelopmentCurrentUserId } from "@/lib/auth/development-current-user";
import { getWardrobeItemForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { developmentWardrobeRepository } from "@/modules/wardrobe/infrastructure/development-wardrobe-store";

type WardrobeItemPageProps = Readonly<{
  params: Promise<{ itemId: string }>;
}>;

export const metadata: Metadata = {
  title: "Wardrobe item",
};

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function WardrobeItemPage({ params }: WardrobeItemPageProps) {
  const { itemId } = await params;
  const ownerId = getDevelopmentCurrentUserId();
  const item = await getWardrobeItemForOwner(itemId, ownerId, developmentWardrobeRepository);

  if (!item) {
    notFound();
  }

  return (
    <div className="page-frame item-detail-page">
      <Link className="back-link" href="/wardrobe">
        <span aria-hidden="true">←</span> Back to wardrobe
      </Link>

      <article className="item-detail-layout">
        <div className="item-detail-visual" aria-hidden="true">
          <span>{item.name.slice(0, 1).toUpperCase()}</span>
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
    </div>
  );
}
