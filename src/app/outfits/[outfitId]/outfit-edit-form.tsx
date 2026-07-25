"use client";

import { useActionState, useState } from "react";

import type { Outfit } from "@/modules/outfits/domain/outfit";
import type { WardrobeCategory, WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

import { updateOutfitAction } from "./actions";
import { initialOutfitLifecycleFormState, type OutfitLifecycleFormState } from "./form-state";

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldError(state: OutfitLifecycleFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

function groupItems(items: readonly WardrobeItem[]): ReadonlyMap<WardrobeCategory, WardrobeItem[]> {
  const groups = new Map<WardrobeCategory, WardrobeItem[]>();
  for (const item of items) {
    const categoryItems = groups.get(item.category) ?? [];
    categoryItems.push(item);
    groups.set(item.category, categoryItems);
  }
  return groups;
}

export function OutfitEditForm({
  outfit,
  items,
}: Readonly<{
  outfit: Outfit;
  items: readonly WardrobeItem[];
}>) {
  const action = updateOutfitAction.bind(null, outfit.id);
  const [state, formAction, pending] = useActionState(action, initialOutfitLifecycleFormState);
  const availableItems = items.filter((item) => item.ownershipStatus !== "archived");
  const availableIds = new Set(availableItems.map((item) => item.id));
  const selectedIds = new Set(outfit.wardrobeItemIds.filter((itemId) => availableIds.has(itemId)));
  const unavailableSelectionCount = outfit.wardrobeItemIds.length - selectedIds.size;
  const [selectedCount, setSelectedCount] = useState(selectedIds.size);
  const groups = groupItems(availableItems);

  return (
    <form action={formAction} className="outfit-form outfit-edit-form">
      <input name="expectedRevision" type="hidden" value={outfit.revision} />

      {state.status === "error" ? (
        <div aria-live="polite" className="form-message form-message-error" role="alert">
          {state.message}
        </div>
      ) : null}

      {unavailableSelectionCount > 0 ? (
        <div className="form-message form-message-error" role="alert">
          {unavailableSelectionCount} existing {unavailableSelectionCount === 1 ? "piece is" : "pieces are"}
          {" "}archived or unavailable. Remove or restore them before saving this revision.
        </div>
      ) : null}

      <section className="outfit-form-section" aria-labelledby="edit-outfit-identity-title">
        <div className="outfit-section-heading">
          <span>01</span>
          <div>
            <div className="eyebrow">Edit identity</div>
            <h2 id="edit-outfit-identity-title">Refine the look without losing its history.</h2>
            <p>Saving creates revision {outfit.revision + 1} when no other session changed it first.</p>
          </div>
        </div>

        <div className="outfit-identity-grid">
          <div className="field">
            <label htmlFor="edit-outfit-name">Outfit name</label>
            <input
              defaultValue={outfit.name}
              id="edit-outfit-name"
              maxLength={120}
              name="name"
              required
              type="text"
            />
            {fieldError(state, "name") ? (
              <span className="field-error">{fieldError(state, "name")}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="edit-outfit-occasion">Occasion</label>
            <input
              defaultValue={outfit.occasion ?? ""}
              id="edit-outfit-occasion"
              maxLength={80}
              name="occasion"
              type="text"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="edit-outfit-notes">Private styling notes</label>
          <textarea
            defaultValue={outfit.stylingNotes ?? ""}
            id="edit-outfit-notes"
            maxLength={1_000}
            name="stylingNotes"
            rows={5}
          />
        </div>
      </section>

      <fieldset className="outfit-form-section outfit-item-picker">
        <legend className="sr-only">Edit wardrobe items</legend>
        <div className="outfit-section-heading">
          <span>02</span>
          <div>
            <div className="eyebrow">Edit composition</div>
            <h2>Keep only the pieces that still belong.</h2>
            <p>Every selected item is verified again before the new revision is saved.</p>
          </div>
        </div>

        <div className="outfit-selection-summary" aria-live="polite">
          <strong>{selectedCount}</strong>
          <span>{selectedCount === 1 ? "item selected" : "items selected"}</span>
        </div>

        {[...groups.entries()].map(([category, categoryItems]) => (
          <section className="outfit-category-group" key={category}>
            <h3>{label(category)}</h3>
            <div className="outfit-item-grid">
              {categoryItems.map((item) => {
                const id = `edit-outfit-item-${item.id}`;
                return (
                  <label className="outfit-item-choice" htmlFor={id} key={item.id}>
                    <input
                      defaultChecked={selectedIds.has(item.id)}
                      id={id}
                      name="wardrobeItemIds"
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setSelectedCount((current) => (checked ? current + 1 : current - 1));
                      }}
                      type="checkbox"
                      value={item.id}
                    />
                    <span className="outfit-item-choice-visual" aria-hidden="true">
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="outfit-item-choice-copy">
                      <strong>{item.name}</strong>
                      <small>{item.brand ?? "Brand not recorded"} · {item.primaryColor}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        {fieldError(state, "wardrobeItemIds") ? (
          <span className="field-error">{fieldError(state, "wardrobeItemIds")}</span>
        ) : null}
      </fieldset>

      <footer className="outfit-form-footer">
        <div>
          <strong>Revision protected.</strong>
          <p>Stale edits are rejected instead of overwriting another session.</p>
        </div>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Saving revision…" : "Save outfit revision"}
        </button>
      </footer>
    </form>
  );
}
