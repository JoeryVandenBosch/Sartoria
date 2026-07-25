"use client";

import { useActionState } from "react";

import {
  climateProfiles,
  fitPreferences,
  profileColours,
  profileMaterials,
  recommendationModes,
  styleDirections,
  type StyleProfile,
} from "@/modules/profile/domain/style-profile";

import { saveStyleProfileAction } from "./actions";
import {
  initialStyleProfileFormState,
  type StyleProfileFormState,
} from "./form-state";
import { ProfileResetButton } from "./profile-reset-button";

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldError(state: StyleProfileFormState, field: string): string | undefined {
  return state.fieldErrors[field]?.[0];
}

type CheckboxGroupProps<Value extends string> = Readonly<{
  legend: string;
  description: string;
  name: string;
  values: readonly Value[];
  selected: readonly Value[];
  error?: string;
}>;

function CheckboxGroup<Value extends string>({
  legend,
  description,
  name,
  values,
  selected,
  error,
}: CheckboxGroupProps<Value>) {
  return (
    <fieldset className="profile-choice-group">
      <legend>{legend}</legend>
      <p>{description}</p>
      <div className="choice-grid">
        {values.map((value) => {
          const id = `${name}-${value}`;
          return (
            <label className="choice-chip" htmlFor={id} key={value}>
              <input
                defaultChecked={selected.includes(value)}
                id={id}
                name={name}
                type="checkbox"
                value={value}
              />
              <span>{label(value)}</span>
            </label>
          );
        })}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </fieldset>
  );
}

export function StyleProfileForm({ profile }: Readonly<{ profile: StyleProfile | null }>) {
  const [state, formAction, pending] = useActionState(
    saveStyleProfileAction,
    initialStyleProfileFormState,
  );

  const fitPreference = profile?.fitPreference ?? "regular";
  const climateProfile = profile?.climateProfile ?? "mixed";
  const recommendationMode = profile?.recommendationMode ?? "wardrobe-first";

  return (
    <form action={formAction} className="style-profile-form">
      <input name="expectedRevision" type="hidden" value={profile?.revision ?? 0} />

      {state.status !== "idle" ? (
        <div
          aria-live="polite"
          className={`form-message form-message-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <section className="profile-form-section" aria-labelledby="profile-foundation-title">
        <div className="profile-section-heading">
          <span>01</span>
          <div>
            <div className="eyebrow">Foundation</div>
            <h2 id="profile-foundation-title">How should clothes feel and function?</h2>
            <p>These broad controls guide future outfit and recommendation logic.</p>
          </div>
        </div>

        <div className="profile-three-column-grid">
          <div className="field">
            <label htmlFor="fit-preference">Fit preference</label>
            <select defaultValue={fitPreference} id="fit-preference" name="fitPreference">
              {fitPreferences.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
            {fieldError(state, "fitPreference") ? (
              <span className="field-error">{fieldError(state, "fitPreference")}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="climate-profile">Climate context</label>
            <select defaultValue={climateProfile} id="climate-profile" name="climateProfile">
              {climateProfiles.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
            <span className="field-hint">Broad context only—no precise location is collected.</span>
          </div>

          <div className="field">
            <label htmlFor="recommendation-mode">Recommendation mode</label>
            <select
              defaultValue={recommendationMode}
              id="recommendation-mode"
              name="recommendationMode"
            >
              {recommendationModes.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
            <span className="field-hint">Wardrobe-first is the most restrained setting.</span>
          </div>
        </div>
      </section>

      <section className="profile-form-section" aria-labelledby="profile-style-title">
        <div className="profile-section-heading">
          <span>02</span>
          <div>
            <div className="eyebrow">Style signals</div>
            <h2 id="profile-style-title">Define the language, not a costume.</h2>
            <p>Select up to eight directions. They remain user-controlled and correctable.</p>
          </div>
        </div>

        <CheckboxGroup
          description="Choose the directions that should influence future styling advice."
          error={fieldError(state, "styleDirections")}
          legend="Style directions"
          name="styleDirections"
          selected={profile?.styleDirections ?? []}
          values={styleDirections}
        />
      </section>

      <section className="profile-form-section" aria-labelledby="profile-colour-title">
        <div className="profile-section-heading">
          <span>03</span>
          <div>
            <div className="eyebrow">Colour</div>
            <h2 id="profile-colour-title">Clarify what belongs—and what does not.</h2>
            <p>A colour cannot be both preferred and avoided.</p>
          </div>
        </div>

        <div className="profile-split-grid">
          <CheckboxGroup
            description="Colours you want Sartoria to favour."
            error={fieldError(state, "preferredColours")}
            legend="Preferred colours"
            name="preferredColours"
            selected={profile?.preferredColours ?? []}
            values={profileColours}
          />
          <CheckboxGroup
            description="Colours Sartoria should normally exclude."
            error={fieldError(state, "avoidedColours")}
            legend="Avoided colours"
            name="avoidedColours"
            selected={profile?.avoidedColours ?? []}
            values={profileColours}
          />
        </div>
      </section>

      <section className="profile-form-section" aria-labelledby="profile-brand-title">
        <div className="profile-section-heading">
          <span>04</span>
          <div>
            <div className="eyebrow">Brands and materials</div>
            <h2 id="profile-brand-title">Record affinity without becoming brand-led.</h2>
            <p>Enter one brand per line. Wardrobe coherence remains more important than labels.</p>
          </div>
        </div>

        <div className="profile-split-grid">
          <div className="field">
            <label htmlFor="preferred-brands">Preferred brands</label>
            <textarea
              defaultValue={profile?.preferredBrands.join("\n") ?? ""}
              id="preferred-brands"
              maxLength={1_700}
              name="preferredBrands"
              placeholder="One brand per line"
              rows={6}
            />
            {fieldError(state, "preferredBrands") ? (
              <span className="field-error">{fieldError(state, "preferredBrands")}</span>
            ) : (
              <span className="field-hint">Maximum 20 brands.</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="avoided-brands">Avoided brands</label>
            <textarea
              defaultValue={profile?.avoidedBrands.join("\n") ?? ""}
              id="avoided-brands"
              maxLength={1_700}
              name="avoidedBrands"
              placeholder="One brand per line"
              rows={6}
            />
            {fieldError(state, "avoidedBrands") ? (
              <span className="field-error">{fieldError(state, "avoidedBrands")}</span>
            ) : (
              <span className="field-hint">Maximum 20 brands.</span>
            )}
          </div>
        </div>

        <CheckboxGroup
          description="Materials to exclude because of comfort, ethics, care, or personal preference."
          error={fieldError(state, "excludedMaterials")}
          legend="Excluded materials"
          name="excludedMaterials"
          selected={profile?.excludedMaterials ?? []}
          values={profileMaterials}
        />
      </section>

      <section className="profile-form-section" aria-labelledby="profile-measurements-title">
        <div className="profile-section-heading">
          <span>05</span>
          <div>
            <div className="eyebrow">Optional measurements</div>
            <h2 id="profile-measurements-title">Useful when you choose to use them.</h2>
            <p>Values stay private and are excluded from recommendations unless you enable them.</p>
          </div>
        </div>

        <div className="measurement-grid">
          <div className="field">
            <label htmlFor="height-cm">Height (cm)</label>
            <input
              defaultValue={profile?.measurements.heightCm ?? ""}
              id="height-cm"
              max={250}
              min={100}
              name="heightCm"
              step={1}
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor="chest-cm">Chest (cm)</label>
            <input
              defaultValue={profile?.measurements.chestCm ?? ""}
              id="chest-cm"
              max={200}
              min={50}
              name="chestCm"
              step={1}
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor="waist-cm">Waist (cm)</label>
            <input
              defaultValue={profile?.measurements.waistCm ?? ""}
              id="waist-cm"
              max={200}
              min={40}
              name="waistCm"
              step={1}
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor="inseam-cm">Inseam (cm)</label>
            <input
              defaultValue={profile?.measurements.inseamCm ?? ""}
              id="inseam-cm"
              max={130}
              min={40}
              name="inseamCm"
              step={1}
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor="shoe-size-eu">EU shoe size</label>
            <input
              defaultValue={profile?.measurements.shoeSizeEu ?? ""}
              id="shoe-size-eu"
              max={55}
              min={25}
              name="shoeSizeEu"
              step={0.5}
              type="number"
            />
          </div>
        </div>

        <label className="profile-consent-control" htmlFor="use-measurements">
          <input
            defaultChecked={profile?.useMeasurementsForRecommendations ?? false}
            id="use-measurements"
            name="useMeasurementsForRecommendations"
            type="checkbox"
          />
          <span>
            <strong>Use my measurements for recommendations</strong>
            <small>You can keep measurements for reference while leaving this disabled.</small>
          </span>
        </label>
      </section>

      <footer className="profile-form-footer">
        <div>
          <p>
            {profile
              ? `Private profile revision ${profile.revision}. Last updated ${new Intl.DateTimeFormat(
                  "en",
                  { dateStyle: "medium", timeZone: "UTC" },
                ).format(new Date(profile.updatedAt))}.`
              : "No private style profile has been saved yet."}
          </p>
          {profile ? (
            <div className="profile-data-actions">
              <a className="text-link text-link-dark" href="/api/profile/export">
                Export JSON
              </a>
              <ProfileResetButton revision={profile.revision} />
            </div>
          ) : null}
        </div>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Saving profile…" : "Save private profile"}
        </button>
      </footer>
    </form>
  );
}
