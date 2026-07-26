"use client";

import { useActionState } from "react";

import {
  ownershipStatuses,
  wardrobeCategories,
} from "@/modules/wardrobe/domain/wardrobe-item";

import { createWardrobeItemAction } from "./actions";
import {
  initialWardrobeItemFormState,
  type WardrobeItemFormState,
} from "./form-state";

function fieldError(state: WardrobeItemFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

function label(value: string): string {
  return value
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
  const statusError = fieldError(state, "ownershipStatus");
  const fitNotesError = fieldError(state, "fitNotes");
  const costError = fieldError(state, "acquisitionCost");
  const currencyError = fieldError(state, "acquisitionCurrency");

  return (
    <form action={formAction} className="wardrobe-form">
      <div className="form-heading">
        <div>
          <div className="eyebrow">Add an item</div>
          <h2 aria-label="Record what you own.">Record what belongs—or what you are considering.</h2>
        </div>
        <p>
          Reliable wardrobe facts power private outfits, planning, recommendations, and factual
          insights. Acquisition cost is optional and never inferred.
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
            <span className="field-error" id="wardrobe-name-error">{nameError}</span>
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
            <option disabled value="">Select a category</option>
            {wardrobeCategories.map((category) => (
              <option key={category} value={category}>{label(category)}</option>
            ))}
          </select>
          {categoryError ? (
            <span className="field-error" id="wardrobe-category-error">{categoryError}</span>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="wardrobe-status">Wardrobe status</label>
          <select
            aria-describedby={statusError ? "wardrobe-status-error" : "wardrobe-status-hint"}
            aria-invalid={Boolean(statusError)}
            defaultValue="owned"
            id="wardrobe-status"
            name="ownershipStatus"
          >
            {ownershipStatuses.filter((status) => status !== "archived").map((status) => (
              <option key={status} value={status}>{label(status)}</option>
            ))}
          </select>
          {statusError ? (
            <span className="field-error" id="wardrobe-status-error">{statusError}</span>
          ) : (
            <span className="field-hint" id="wardrobe-status-hint">
              Wish-list items receive purchase-impact analysis but cannot be packed or worn.
            </span>
          )}
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
            <span className="field-error" id="wardrobe-colour-error">{colourError}</span>
          ) : null}
        </div>

        <div className="field">
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
            <span className="field-error" id="wardrobe-brand-error">{brandError}</span>
          ) : (
            <span className="field-hint" id="wardrobe-brand-hint">
              Leave blank when the brand is unknown or not relevant.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="wardrobe-cost">Acquisition cost</label>
          <input
            aria-describedby={costError ? "wardrobe-cost-error" : "wardrobe-cost-hint"}
            aria-invalid={Boolean(costError)}
            id="wardrobe-cost"
            inputMode="decimal"
            maxLength={20}
            name="acquisitionCost"
            placeholder="Optional, e.g. 349.95"
          />
          {costError ? (
            <span className="field-error" id="wardrobe-cost-error">{costError}</span>
          ) : (
            <span className="field-hint" id="wardrobe-cost-hint">
              Owned items only. Used for cost-per-wear without external price lookup.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="wardrobe-currency">Currency</label>
          <input
            aria-describedby={currencyError ? "wardrobe-currency-error" : "wardrobe-currency-hint"}
            aria-invalid={Boolean(currencyError)}
            autoCapitalize="characters"
            id="wardrobe-currency"
            maxLength={3}
            name="acquisitionCurrency"
            placeholder="EUR"
          />
          {currencyError ? (
            <span className="field-error" id="wardrobe-currency-error">{currencyError}</span>
          ) : (
            <span className="field-hint" id="wardrobe-currency-hint">
              Three-letter code. Sartoria never converts currencies.
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
            <span className="field-error" id="wardrobe-fit-error">{fitNotesError}</span>
          ) : (
            <span className="field-hint" id="wardrobe-fit-hint">
              Fit notes remain private and are excluded from factual insight calculations.
            </span>
          )}
        </div>
      </div>

      <div className="form-footer">
        <p>Facts remain owner-scoped. Optional cost is stored exactly as entered and never converted.</p>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Adding item…" : "Add to wardrobe"}
        </button>
      </div>
    </form>
  );
}
