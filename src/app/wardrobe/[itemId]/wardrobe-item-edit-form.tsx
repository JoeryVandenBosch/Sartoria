"use client";

import { useActionState } from "react";

import {
  ownershipStatuses,
  wardrobeCategories,
  type WardrobeItem,
} from "@/modules/wardrobe/domain/wardrobe-item";

import { initialWardrobeItemFormState, type WardrobeItemFormState } from "../form-state";
import { reviseWardrobeItemAction } from "./actions";

function fieldError(state: WardrobeItemFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

function label(value: string): string {
  return value === "wish-list"
    ? "Wish list"
    : value.charAt(0).toUpperCase() + value.slice(1).replace(/-/gu, " ");
}

function majorUnits(minor: number | null | undefined): string {
  return minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);
}

/**
 * Correction form for an item already recorded.
 *
 * Collapsed behind a disclosure by default. Sartoria is a phone product first,
 * and eight always-visible fields would bury the item they describe. Opening is
 * a deliberate act, which also suits a form that changes recorded facts.
 *
 * A native `details` element is used rather than client state, so it works
 * before hydration and is keyboard reachable without extra code.
 */
export function WardrobeItemEditForm({ item }: Readonly<{ item: WardrobeItem }>) {
  const [state, formAction, pending] = useActionState(
    reviseWardrobeItemAction,
    initialWardrobeItemFormState,
  );

  const nameError = fieldError(state, "name");
  const colourError = fieldError(state, "primaryColor");
  const costError = fieldError(state, "acquisitionCost");
  const currencyError = fieldError(state, "acquisitionCurrency");

  return (
    <details className="item-edit" open={state.status === "error"}>
      <summary>
        <span>Correct these details</span>
      </summary>

      <form action={formAction} className="wardrobe-form item-edit-form">
        <input name="itemId" type="hidden" value={item.id} />

        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="edit-name">Item name</label>
            <input
              aria-invalid={Boolean(nameError)}
              defaultValue={item.name}
              id="edit-name"
              maxLength={120}
              name="name"
              required
              type="text"
            />
            {nameError ? <span className="field-error">{nameError}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="edit-category">Category</label>
            <select defaultValue={item.category} id="edit-category" name="category" required>
              {wardrobeCategories.map((category) => (
                <option key={category} value={category}>
                  {label(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="edit-status">Wardrobe status</label>
            <select
              defaultValue={item.ownershipStatus}
              id="edit-status"
              name="ownershipStatus"
              required
            >
              {ownershipStatuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Moving an item away from owned clears its acquisition cost, which the domain
              records only for owned items.
            </span>
          </div>

          <div className="field">
            <label htmlFor="edit-colour">Primary colour</label>
            <input
              aria-invalid={Boolean(colourError)}
              defaultValue={item.primaryColor}
              id="edit-colour"
              maxLength={80}
              name="primaryColor"
              required
              type="text"
            />
            {colourError ? <span className="field-error">{colourError}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="edit-brand">Brand</label>
            <input
              defaultValue={item.brand ?? ""}
              id="edit-brand"
              maxLength={120}
              name="brand"
              type="text"
            />
          </div>

          <div className="field">
            <label htmlFor="edit-cost">Acquisition cost</label>
            <input
              aria-invalid={Boolean(costError)}
              defaultValue={majorUnits(item.acquisitionCostMinor)}
              id="edit-cost"
              inputMode="decimal"
              name="acquisitionCost"
              type="text"
            />
            {costError ? <span className="field-error">{costError}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="edit-currency">Currency</label>
            <input
              aria-invalid={Boolean(currencyError)}
              defaultValue={item.acquisitionCurrency ?? ""}
              id="edit-currency"
              maxLength={3}
              name="acquisitionCurrency"
              placeholder="EUR"
              type="text"
            />
            {currencyError ? <span className="field-error">{currencyError}</span> : null}
          </div>

          <div className="field field-wide">
            <label htmlFor="edit-notes">Fit notes</label>
            <textarea
              defaultValue={item.fitNotes ?? ""}
              id="edit-notes"
              maxLength={500}
              name="fitNotes"
              rows={3}
            />
          </div>
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className={state.status === "error" ? "form-error" : "form-success"}
            role="status"
          >
            {state.message}
          </p>
        ) : null}

        <div className="form-footer">
          <button className="button button-primary" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </details>
  );
}
