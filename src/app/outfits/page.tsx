import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { listOutfitsForOwner } from "@/modules/outfits/application/query-outfits";
import { getOutfitRepository } from "@/modules/outfits/infrastructure/outfit-repository";
import { listWardrobeItemsForOwner } from "@/modules/wardrobe/application/query-wardrobe-items";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { OutfitForm } from "./outfit-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Outfits",
  description: "Private deterministic outfit composition from your wardrobe.",
};

export default async function OutfitsPage() {
  const ownerId = await getCurrentUserId();
  const wardrobeRepository = getWardrobeRepository();
  const [outfits, wardrobeItems] = await Promise.all([
    listOutfitsForOwner(ownerId, getOutfitRepository()),
    listWardrobeItemsForOwner(ownerId, wardrobeRepository),
  ]);
  const selectableItems = wardrobeItems.filter((item) => item.ownershipStatus !== "archived");

  return (
    <div className="page-frame outfits-page">
      <header className="outfits-hero">
        <div>
          <div className="eyebrow">Private looks</div>
          <h1>Compose with what you own.</h1>
        </div>
        <p>
          Build reliable outfits manually before asking for recommendations. Every saved look stays
          grounded in your private wardrobe and remains fully editable by you.
        </p>
      </header>

      <section aria-labelledby="saved-outfits-title" className="saved-outfits-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Saved compositions</div>
            <h2 id="saved-outfits-title">Your outfits</h2>
          </div>
          <span className="item-count">
            {outfits.length} {outfits.length === 1 ? "outfit" : "outfits"}
          </span>
        </div>

        {outfits.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">
              04
            </span>
            <div>
              <h3>Your first look starts with two reliable pieces.</h3>
              <p>Select from the wardrobe below. Sartoria will preserve the composition without AI.</p>
            </div>
          </div>
        ) : (
          <div className="outfit-card-grid">
            {outfits.map((outfit) => (
              <article className="outfit-card" key={outfit.id}>
                <div className="outfit-card-number" aria-hidden="true">
                  {String(outfit.wardrobeItemIds.length).padStart(2, "0")}
                </div>
                <div className="outfit-card-copy">
                  <div className="outfit-card-meta">
                    <span>{outfit.occasion ?? "Everyday"}</span>
                    <span>{outfit.wardrobeItemIds.length} pieces</span>
                  </div>
                  <h3>{outfit.name}</h3>
                  <p>
                    Updated {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(outfit.updatedAt))}
                  </p>
                  <Link className="text-link text-link-dark" href={`/outfits/${outfit.id}`}>
                    View outfit <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="compose-outfit-title" className="compose-outfit-section">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">New composition</div>
            <h2 id="compose-outfit-title">Build a private outfit</h2>
          </div>
          <span className="item-count">{selectableItems.length} available items</span>
        </div>

        {selectableItems.length < 2 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">
              02
            </span>
            <div>
              <h3>Add at least two available wardrobe items first.</h3>
              <p>Archived items are not eligible for new outfits.</p>
              <Link className="text-link text-link-dark" href="/wardrobe">
                Open wardrobe <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        ) : (
          <OutfitForm items={selectableItems} />
        )}
      </section>
    </div>
  );
}
