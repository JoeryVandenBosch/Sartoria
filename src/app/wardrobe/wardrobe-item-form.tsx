"use client";

import { useActionState } from "react";

import { wardrobeCategories } from "@/modules/wardrobe/domain/wardrobe-item";

import {
  createWardrobeItemAction,
  initialWardrobeItemFormState,
  type WardrobeItemFormState,
} from "./actions";

function fieldError(state: WardrobeItemFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

function categoryLabel(category: string): string {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function WardrobeItemForm() {
  const [state, formAction, pending] = useActionState(
    createWardrobeItemAction,
    initialWardrobeItemFormState,
  );

  const nameError = fieldError(state, "name");
  const categoryError = fieldError(state, "category");
  const colourError = fieldError(state, "primaryColor");
  const brandError = fieldError(state, "brand");
  const fitNotesError = fieldError(state, "fitNotes");

  return (
    <form action={formAction} className="wardrobe-form">
      <div className="form-heading">
        <div>
          <div className="eyebrow">Add an item</div>
          <h2>Record what you own.</h2>
        </div>
        <p>
          Begin with reliable details. Imagery, outfits, and recommendations will build on these
          wardrobe facts later.
        </p>
      </div>

      {state.status !== "idle" ? (
        <div
          aria-live="polite"
          className={`form-message form-message-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <div className="form-grid">
        <div className="field field-wide">
          <label htmlFor="wardrobe-name">Item name</label>
          <input
            aria-describedby={nameError ? "wardrobe-name-error" : undefined}
            aria-invalid={Boolean(nameError)}
            autoComplete="off"
            id="wardrobe-name"
            maxLength={120}
            name="name"
            placeholder="Navy knitted blazer"
            required
            type="text"
          />
          {nameError ? (
            <span className="field-error" id="wardrobe-name-error">
              {nameError}
            </span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="wardrobe-category">Category</label>
          <select
            aria-describedby={categoryError ? "wardrobe-category-error" : undefined}
            aria-invalid={Boolean(categoryError)}
            defaultValue=""
            id="wardrobe-category"
            name="category"
            required
          >
            <option disabled value="">
              Select a category
            </option>
            {wardrobeCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          {categoryError ? (
            <span className="field-error" id="wardrobe-category-error">
              {categoryError}
            </span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="wardrobe-colour">Primary colour</label>
          <input
            aria-describedby={colourError ? "wardrobe-colour-error" : undefined}
            aria-invalid={Boolean(colourError)}
            autoComplete="off"
            id="wardrobe-colour"
            maxLength={80}
            name="primaryColor"
            placeholder="Deep navy"
            required
            type="text"
          />
          {colourError ? (
            <span className="field-error" id="wardrobe-colour-error">
              {colourError}
            </span>
          ) : null}
        </div>

        <div className="field field-wide">
          <label htmlFor="wardrobe-brand">Brand</label>
          <input
            aria-describedby={brandError ? "wardrobe-brand-error" : "wardrobe-brand-hint"}
            aria-invalid={Boolean(brandError)}
            autoComplete="organization"
            id="wardrobe-brand"
            maxLength={120}
            name="brand"
            placeholder="Optional"
            type="text"
          />
          {brandError ? (
            <span className="field-error" id="wardrobe-brand-error">
              {brandError}
            </span>
          ) : (
            <span className="field-hint" id="wardrobe-brand-hint">
              Leave blank when the brand is unknown or not relevant.
            </span>
          )}
        </div>

        <div className="field field-wide">
          <label htmlFor="wardrobe-fit-notes">Fit notes</label>
          <textarea
            aria-describedby={fitNotesError ? "wardrobe-fit-error" : "wardrobe-fit-hint"}
            aria-invalid={Boolean(fitNotesError)}
            id="wardrobe-fit-notes"
            maxLength={500}
            name="fitNotes"
            placeholder="Optional private notes about fit, proportion, or alterations"
            rows={4}
          />
          {fitNotesError ? (
            <span className="field-error" id="wardrobe-fit-error">
              {fitNotesError}
            </span>
          ) : (
            <span className="field-hint" id="wardrobe-fit-hint">
              Fit notes remain private and are never written to operational logs.
            </span>
          )}
        </div>
      </div>

      <div className="form-footer">
        <p>Development foundation: production authentication and persistence are not connected yet.</p>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Adding item…" : "Add to wardrobe"}
        </button>
      </div>
    </form>
  );
}
