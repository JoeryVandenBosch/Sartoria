import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { listTravelPlansForOwner } from "@/modules/planning/application/query-travel-plans";
import { travelDurationDays } from "@/modules/planning/domain/travel-plan";
import { getTravelPlanRepository } from "@/modules/planning/infrastructure/travel-plan-repository";

import { TravelPlanForm } from "./travel-plan-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planning",
  description: "Private deterministic travel plans and wardrobe-grounded packing lists.",
};

function dateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(`${startDate}T00:00:00.000Z`))} – ${formatter.format(
    new Date(`${endDate}T00:00:00.000Z`),
  )}`;
}

export default async function PlanningPage() {
  const ownerId = await getCurrentUserId();
  const plans = await listTravelPlansForOwner(ownerId, getTravelPlanRepository());

  return (
    <div className="page-frame planning-page">
      <header className="planning-hero">
        <div>
          <div className="eyebrow">Private travel planning</div>
          <h1>Pack with intention.</h1>
        </div>
        <div className="planning-hero-copy">
          <p>
            Set broad dates, expected climate, activities, and laundry access. Sartoria builds a
            deterministic packing preview from what you already own.
          </p>
          <div className="profile-privacy-note">
            <strong>No tracking required.</strong>
            <span>No coordinates, calendar, bookings, live weather, or AI provider are needed.</span>
          </div>
        </div>
      </header>

      <TravelPlanForm />

      <section aria-labelledby="travel-history-title" className="travel-history">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Private plan history</div>
            <h2 id="travel-history-title">Saved travel plans</h2>
          </div>
          <span className="item-count">{plans.length} {plans.length === 1 ? "plan" : "plans"}</span>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-number">06</span>
            <div>
              <h3>No travel plans yet.</h3>
              <p>Build a deterministic preview above and choose the final packing list.</p>
            </div>
          </div>
        ) : (
          <div className="travel-plan-grid">
            {plans.map((plan) => {
              const duration = travelDurationDays(plan.startDate, plan.endDate);
              return (
                <article className="travel-plan-card" key={plan.id}>
                  <div className="travel-plan-card-meta">
                    <span>{plan.destination ?? "Destination not recorded"}</span>
                    <span>{duration} {duration === 1 ? "day" : "days"}</span>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{dateRange(plan.startDate, plan.endDate)}</p>
                  <dl>
                    <div><dt>Climate</dt><dd>{plan.climate}</dd></div>
                    <div><dt>Items</dt><dd>{plan.wardrobeItemIds.length}</dd></div>
                  </dl>
                  <Link
                    aria-label={`Open travel plan ${plan.name}`}
                    className="text-link text-link-dark"
                    href={`/planning/${encodeURIComponent(plan.id)}`}
                  >
                    Inspect packing plan
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
