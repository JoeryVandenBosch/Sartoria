"use client";

import { useActionState, useState } from "react";

import type { WardrobeCategory, WardrobeItem } from "@/modules/wardrobe/domain/wardrobe-item";

import { createOutfitAction } from "./actions";
import { initialOutfitFormState, type OutfitFormState } from "./form-state";

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldError(state: OutfitFormState, field: string): string | undefined {
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

export function OutfitForm({ items }: Readonly<{ items: readonly WardrobeItem[] }>) {
  const [state, formAction, pending] = useActionState(
    createOutfitAction,
    initialOutfitFormState,
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const groups = groupItems(items);

  return (
    <form action={formAction} className="outfit-form">
      {state.status === "error" ? (
        <div aria-live="polite" className="form-message form-message-error" role="alert">
          {state.message}
        </div>
      ) : null}

      <section className="outfit-form-section" aria-labelledby="outfit-identity-title">
        <div className="outfit-section-heading">
          <span>01</span>
          <div>
            <div className="eyebrow">Identity</div>
            <h2 id="outfit-identity-title">Give the look a useful name.</h2>
            <p>Keep it factual enough to recognise later. You can add private context below.</p>
          </div>
        </div>

        <div className="outfit-identity-grid">
          <div className="field">
            <label htmlFor="outfit-name">Outfit name</label>
            <input
              autoComplete="off"
              id="outfit-name"
              maxLength={120}
              name="name"
              placeholder="Navy dinner look"
              required
              type="text"
            />
            {fieldError(state, "name") ? (
              <span className="field-error">{fieldError(state, "name")}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="outfit-occasion">Occasion</label>
            <input
              autoComplete="off"
              id="outfit-occasion"
              maxLength={80}
              name="occasion"
              placeholder="Dinner, office, travel…"
              type="text"
            />
            <span className="field-hint">Optional and private.</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="outfit-notes">Private styling notes</label>
          <textarea
            id="outfit-notes"
            maxLength={1_000}
            name="stylingNotes"
            placeholder="Why this combination works, preferred layers, footwear alternatives…"
            rows={5}
          />
          <span className="field-hint">Visible only inside your private outfit detail.</span>
        </div>
      </section>

      <fieldset className="outfit-form-section outfit-item-picker">
        <legend className="sr-only">Wardrobe items</legend>
        <div className="outfit-section-heading">
          <span>02</span>
          <div>
            <div className="eyebrow">Composition</div>
            <h2>Choose the pieces deliberately.</h2>
            <p>Select between two and twelve available wardrobe items. Archived items are excluded.</p>
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
                const id = `outfit-item-${item.id}`;
                return (
                  <label className="outfit-item-choice" htmlFor={id} key={item.id}>
                    <input
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
                      <small>
                        {item.brand ?? "Brand not recorded"} · {item.primaryColor}
                      </small>
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
          <strong>Manual by design.</strong>
          <p>No AI is used to assemble or score this outfit.</p>
        </div>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Saving outfit…" : "Save private outfit"}
        </button>
      </footer>
    </form>
  );
}
