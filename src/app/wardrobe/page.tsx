import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  categoryFacets,
  filterWardrobeItems,
  parseWardrobeBrowseSelection,
  statusFacets,
  wardrobeBrowseHref,
} from "@/modules/wardrobe/application/browse-wardrobe-items";
import { listWardrobeItemsForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { WardrobeItemForm } from "./wardrobe-item-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wardrobe",
};

function statusLabel(status: string): string {
  return status === "wish-list" ? "Wish list" : categoryLabel(status);
}

function categoryLabel(category: string): string {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function WardrobePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const ownerId = await getCurrentUserId();
  const allItems = await listWardrobeItemsForOwner(ownerId, getWardrobeRepository());

  const selection = parseWardrobeBrowseSelection(await searchParams);
  const items = filterWardrobeItems(allItems, selection);
  const statuses = statusFacets(allItems);
  const categories = categoryFacets(allItems, selection.status);
  const filtered = selection.status !== undefined || selection.category !== undefined;

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
          <div className="wardrobe-controls">
            <span className="item-count">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <div aria-label="View" className="wardrobe-view-toggle" role="group">
              {(["tile", "list"] as const).map((view) => (
                <Link
                  aria-current={selection.view === view ? "true" : undefined}
                  className="wardrobe-view-option"
                  href={wardrobeBrowseHref(selection, { view })}
                  key={view}
                  replace
                  scroll={false}
                >
                  {view === "tile" ? "Tiles" : "List"}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {allItems.length > 0 ? (
          <div className="wardrobe-filters">
            <div className="wardrobe-filter-group">
              <span className="wardrobe-filter-label" id="wardrobe-status-filter">
                Status
              </span>
              <div className="wardrobe-filter-options" aria-labelledby="wardrobe-status-filter">
                <Link
                  aria-current={selection.status === undefined ? "true" : undefined}
                  className="wardrobe-filter-option"
                  href={wardrobeBrowseHref(selection, { status: undefined })}
                  replace
                  scroll={false}
                >
                  All <span className="wardrobe-filter-count">{allItems.length}</span>
                </Link>
                {statuses.map((facet) => (
                  <Link
                    aria-current={selection.status === facet.value ? "true" : undefined}
                    className="wardrobe-filter-option"
                    href={wardrobeBrowseHref(selection, {
                      status: facet.value,
                      // Clearing the category avoids landing on a combination
                      // that matches nothing.
                      category: undefined,
                    })}
                    key={facet.value}
                    replace
                    scroll={false}
                  >
                    {statusLabel(facet.value)}{" "}
                    <span className="wardrobe-filter-count">{facet.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {categories.length > 1 ? (
              <div className="wardrobe-filter-group">
                <span className="wardrobe-filter-label" id="wardrobe-category-filter">
                  Category
                </span>
                <div
                  className="wardrobe-filter-options"
                  aria-labelledby="wardrobe-category-filter"
                >
                  <Link
                    aria-current={selection.category === undefined ? "true" : undefined}
                    className="wardrobe-filter-option"
                    href={wardrobeBrowseHref(selection, { category: undefined })}
                    replace
                    scroll={false}
                  >
                    All
                  </Link>
                  {categories.map((facet) => (
                    <Link
                      aria-current={selection.category === facet.value ? "true" : undefined}
                      className="wardrobe-filter-option"
                      href={wardrobeBrowseHref(selection, { category: facet.value })}
                      key={facet.value}
                      replace
                      scroll={false}
                    >
                      {categoryLabel(facet.value)}{" "}
                      <span className="wardrobe-filter-count">{facet.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {items.length === 0 && filtered ? (
          <div className="empty-state">
            <div>
              <h3>Nothing matches this selection.</h3>
              <p>
                Your wardrobe holds {allItems.length}{" "}
                {allItems.length === 1 ? "item" : "items"}.{" "}
                <Link className="text-link" href="/wardrobe?status=all">
                  Show everything
                </Link>
                .
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
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
          <div className={selection.view === "list" ? "wardrobe-list" : "wardrobe-grid"}>
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
