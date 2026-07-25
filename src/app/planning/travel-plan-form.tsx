"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  travelActivityContexts,
  travelClimateExpectations,
  travelLaundryAccessLevels,
  type TravelActivityContext,
  type TravelClimateExpectation,
  type TravelLaundryAccess,
} from "@/modules/planning/domain/travel-plan";
import type { WardrobeCategory } from "@/modules/wardrobe/domain/wardrobe-item";

type AvailableItem = Readonly<{
  id: string;
  category: WardrobeCategory;
  name: string;
  brand: string | null;
  primaryColor: string;
}>;

type PreviewResponse = Readonly<{
  suggestion: Readonly<{
    durationDays: number;
    items: readonly Readonly<{ itemId: string; reason: string }>[];
    warnings: readonly string[];
    targets: readonly Readonly<{ label: string; target: number }>[];
  }>;
  availableItems: readonly AvailableItem[];
}>;

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TravelPlanForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [climate, setClimate] = useState<TravelClimateExpectation>("mixed");
  const [activities, setActivities] = useState<TravelActivityContext[]>(["everyday"]);
  const [laundryAccess, setLaundryAccess] = useState<TravelLaundryAccess>("none");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const reasons = useMemo(
    () => new Map(preview?.suggestion.items.map((item) => [item.itemId, item.reason]) ?? []),
    [preview],
  );

  function toggleActivity(value: TravelActivityContext, checked: boolean) {
    setActivities((current) =>
      checked
        ? [...new Set([...current, value])]
        : current.filter((activity) => activity !== value),
    );
    setPreview(null);
  }

  function toggleItem(itemId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, itemId])] : current.filter((id) => id !== itemId),
    );
  }

  async function buildPreview() {
    setMessage("");
    setPreviewing(true);
    try {
      const response = await fetch("/api/planning/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startDate, endDate, climate, activities, laundryAccess }),
      });
      const result = (await response.json()) as PreviewResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Sartoria could not build the packing preview.");
      }
      setPreview(result);
      setSelectedIds(result.suggestion.items.map((item) => item.itemId));
      setMessage(
        `Packing preview created for ${result.suggestion.durationDays} ${
          result.suggestion.durationDays === 1 ? "day" : "days"
        }.` ,
      );
    } catch (error) {
      setPreview(null);
      setSelectedIds([]);
      setMessage(error instanceof Error ? error.message : "The packing preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!preview) {
      setMessage("Build a packing preview before saving the plan.");
      return;
    }
    if (selectedIds.length < 2) {
      setMessage("Select at least two wardrobe items for the packing list.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          destination,
          startDate,
          endDate,
          climate,
          activities,
          laundryAccess,
          notes,
          wardrobeItemIds: selectedIds,
          packingWarnings: preview.suggestion.warnings,
        }),
      });
      const result = (await response.json()) as { planId?: string; error?: string };
      if (!response.ok || !result.planId) {
        throw new Error(result.error ?? "Sartoria could not save the travel plan.");
      }
      router.push(`/planning/${encodeURIComponent(result.planId)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The travel plan could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="travel-plan-form" onSubmit={save}>
      <section className="travel-input-section" aria-labelledby="travel-basics-title">
        <div className="travel-section-heading">
          <span>01</span>
          <div>
            <div className="eyebrow">Trip basics</div>
            <h2 id="travel-basics-title">Plan broadly. Keep details private.</h2>
          </div>
        </div>

        <div className="travel-field-grid">
          <div className="field">
            <label htmlFor="travel-name">Trip name</label>
            <input
              id="travel-name"
              maxLength={120}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              value={name}
            />
          </div>
          <div className="field">
            <label htmlFor="travel-destination">Broad destination</label>
            <input
              id="travel-destination"
              maxLength={120}
              onChange={(event) => setDestination(event.currentTarget.value)}
              placeholder="Copenhagen, Northern Italy, coast…"
              value={destination}
            />
            <span className="field-hint">No coordinates or booking data are collected.</span>
          </div>
          <div className="field">
            <label htmlFor="travel-start">Start date</label>
            <input
              id="travel-start"
              onChange={(event) => {
                setStartDate(event.currentTarget.value);
                setPreview(null);
              }}
              required
              type="date"
              value={startDate}
            />
          </div>
          <div className="field">
            <label htmlFor="travel-end">End date</label>
            <input
              id="travel-end"
              onChange={(event) => {
                setEndDate(event.currentTarget.value);
                setPreview(null);
              }}
              required
              type="date"
              value={endDate}
            />
          </div>
        </div>
      </section>

      <section className="travel-input-section" aria-labelledby="travel-context-title">
        <div className="travel-section-heading">
          <span>02</span>
          <div>
            <div className="eyebrow">Packing context</div>
            <h2 id="travel-context-title">Set the conditions you expect.</h2>
          </div>
        </div>

        <div className="travel-field-grid travel-field-grid-compact">
          <div className="field">
            <label htmlFor="travel-climate">Climate expectation</label>
            <select
              id="travel-climate"
              onChange={(event) => {
                setClimate(event.currentTarget.value as TravelClimateExpectation);
                setPreview(null);
              }}
              value={climate}
            >
              {travelClimateExpectations.map((value) => (
                <option key={value} value={value}>{label(value)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="travel-laundry">Laundry access</label>
            <select
              id="travel-laundry"
              onChange={(event) => {
                setLaundryAccess(event.currentTarget.value as TravelLaundryAccess);
                setPreview(null);
              }}
              value={laundryAccess}
            >
              {travelLaundryAccessLevels.map((value) => (
                <option key={value} value={value}>{label(value)}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="travel-activity-fieldset">
          <legend>Activity contexts</legend>
          <p>Select at least one context. These controls create deterministic category targets.</p>
          <div className="choice-grid">
            {travelActivityContexts.map((value) => (
              <label className="choice-chip" htmlFor={`travel-activity-${value}`} key={value}>
                <input
                  checked={activities.includes(value)}
                  id={`travel-activity-${value}`}
                  onChange={(event) => toggleActivity(value, event.currentTarget.checked)}
                  type="checkbox"
                />
                <span>{label(value)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="travel-notes">Private trip notes</label>
          <textarea
            id="travel-notes"
            maxLength={1_000}
            onChange={(event) => setNotes(event.currentTarget.value)}
            placeholder="Optional context kept out of packing-provider and public metadata."
            rows={4}
            value={notes}
          />
        </div>

        <button
          className="button button-secondary"
          disabled={previewing || activities.length === 0 || !startDate || !endDate}
          onClick={buildPreview}
          type="button"
        >
          {previewing ? "Building preview…" : "Build deterministic packing preview"}
        </button>
      </section>

      {message ? (
        <p aria-live="polite" className="travel-plan-message" role="status">{message}</p>
      ) : null}

      {preview ? (
        <section className="travel-preview-section" aria-labelledby="travel-preview-title">
          <div className="section-heading-row">
            <div>
              <div className="eyebrow">Deterministic preview</div>
              <h2 id="travel-preview-title">Choose the final packing list.</h2>
            </div>
            <span className="item-count">{selectedIds.length} selected</span>
          </div>

          <div className="packing-targets" aria-label="Packing category targets">
            {preview.suggestion.targets.map((target) => (
              <span key={target.label}>{target.label}: {target.target}</span>
            ))}
          </div>

          {preview.suggestion.warnings.length > 0 ? (
            <div className="packing-warnings" role="status">
              <strong>Coverage warnings</strong>
              <ul>
                {preview.suggestion.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="packing-item-grid">
            {preview.availableItems.map((item) => (
              <label className="packing-item-card" htmlFor={`packing-item-${item.id}`} key={item.id}>
                <input
                  checked={selectedIds.includes(item.id)}
                  id={`packing-item-${item.id}`}
                  onChange={(event) => toggleItem(item.id, event.currentTarget.checked)}
                  type="checkbox"
                />
                <span className="packing-item-copy">
                  <span className="eyebrow">{label(item.category)}</span>
                  <strong>{item.name}</strong>
                  <small>{item.brand ?? "Brand not recorded"} · {item.primaryColor}</small>
                  <em>{reasons.get(item.id) ?? "Available owned wardrobe item."}</em>
                </span>
              </label>
            ))}
          </div>

          <footer className="travel-save-footer">
            <span>Your selection is reverified for ownership and availability when saved.</span>
            <button className="button button-primary" disabled={saving} type="submit">
              {saving ? "Saving plan…" : "Save private travel plan"}
            </button>
          </footer>
        </section>
      ) : null}
    </form>
  );
}
