"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { allowedWardrobeMediaTypes } from "@/modules/media/domain/wardrobe-media";

import {
  ownershipStatuses,
  wardrobeCategories,
} from "@/modules/wardrobe/domain/wardrobe-item";

import { createWardrobeItemAction } from "./actions";
import {
  initialWardrobeItemFormState,
  type WardrobeItemFormState,
} from "./form-state";
import { describeUnacceptableFile, uploadWardrobeImage } from "./upload-wardrobe-image";

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
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createWardrobeItemAction,
    initialWardrobeItemFormState,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  // React resets the form automatically after a successful action, which clears
  // the file input before the effect below runs. The selection is therefore
  // captured at choose-time and held here.
  const selectedFile = useRef<File | undefined>(undefined);
  const handledSubmission = useRef<number | undefined>(undefined);
  const [imageMessage, setImageMessage] = useState("");
  const [attaching, setAttaching] = useState(false);

  // The image is attached after the item exists, because media is item-scoped.
  // The file deliberately never travels through the server action: it goes
  // straight to object storage, keeping large originals off the request path.
  useEffect(() => {
    if (state.status !== "success" || state.submissionId === undefined) {
      return;
    }

    if (handledSubmission.current === state.submissionId) {
      return;
    }

    handledSubmission.current = state.submissionId;

    const file = selectedFile.current;
    const itemId = state.createdItemId;

    selectedFile.current = undefined;
    if (fileRef.current) {
      fileRef.current.value = "";
    }

    if (!file || !itemId) {
      setImageMessage("");
      router.refresh();
      return;
    }

    setAttaching(true);
    setImageMessage("");

    // No cancellation on cleanup: React StrictMode mounts effects twice in
    // development, and discarding the result of the first run would leave the
    // outcome unreported. The submission ref above already prevents a second
    // upload, so the in-flight request is allowed to finish and report.
    void uploadWardrobeImage(file, itemId).then((outcome) => {
      setAttaching(false);
      setImageMessage(
        outcome.kind === "uploaded"
          ? outcome.message
          : `The item was added, but the image was not attached. ${outcome.message} You can add an image from the item page.`,
      );
      router.refresh();
    });
  }, [router, state.createdItemId, state.status, state.submissionId]);

  function validateSelection() {
    const file = fileRef.current?.files?.[0];
    const problem = file ? describeUnacceptableFile(file) : undefined;

    // An unacceptable file is not retained, so submitting the form adds the
    // item without silently attempting a doomed upload.
    selectedFile.current = file && !problem ? file : undefined;
    setImageMessage(problem ?? "");
  }

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
        <div className="field field-wide">
          <label htmlFor="wardrobe-item-image">Image</label>
          {/*
            No name attribute: this input is intentionally excluded from the
            server action payload. The file is uploaded separately once the
            item exists.
          */}
          <input
            accept={allowedWardrobeMediaTypes.join(",")}
            aria-describedby="wardrobe-image-hint"
            id="wardrobe-item-image"
            onChange={validateSelection}
            ref={fileRef}
            type="file"
          />
          <span className="field-hint" id="wardrobe-image-hint">
            Optional. A photograph you took, or a screenshot from a shop when you are still
            considering the item. Images enter quarantine, are scanned, and stay private.
          </span>
        </div>
      </div>

      {imageMessage ? (
        <p aria-live="polite" className="media-upload-message" role="status">
          {imageMessage}
        </p>
      ) : null}

      <div className="form-footer">
        <p>Facts remain owner-scoped. Optional cost is stored exactly as entered and never converted.</p>
        <button className="button button-primary" disabled={pending || attaching} type="submit">
          {pending ? "Adding item…" : attaching ? "Securing image…" : "Add to wardrobe"}
        </button>
      </div>
    </form>
  );
}
