import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getTravelPlanForOwner } from "@/modules/planning/application/query-travel-plans";
import { travelDurationDays } from "@/modules/planning/domain/travel-plan";
import { getTravelPlanRepository } from "@/modules/planning/infrastructure/travel-plan-repository";
import { getWardrobeRepository } from "@/modules/wardrobe/infrastructure/wardrobe-repository";

import { TravelPlanDeleteButton } from "./travel-plan-delete-button";

type TravelPlanPageProps = Readonly<{
  params: Promise<{ planId: string }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Travel plan",
};

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export default async function TravelPlanPage({ params }: TravelPlanPageProps) {
  const { planId } = await params;
  const ownerId = await getCurrentUserId();
  const plan = await getTravelPlanForOwner(planId, ownerId, getTravelPlanRepository());
  if (!plan) {
    notFound();
  }

  const wardrobe = await getWardrobeRepository().listByOwner(ownerId);
  const itemMap = new Map(wardrobe.map((item) => [item.id, item]));
  const duration = travelDurationDays(plan.startDate, plan.endDate);

  return (
    <div className="page-frame travel-detail-page">
      <Link className="back-link" href="/planning">
        <span aria-hidden="true">←</span> Back to planning
      </Link>

      <header className="travel-detail-hero">
        <div>
          <div className="eyebrow">{plan.destination ?? "Private travel plan"}</div>
          <h1>{plan.name}</h1>
          <p>{formattedDate(plan.startDate)} – {formattedDate(plan.endDate)}</p>
        </div>
        <aside className="travel-facts-card" aria-label="Travel plan facts">
          <dl>
            <div><dt>Duration</dt><dd>{duration} {duration === 1 ? "day" : "days"}</dd></div>
            <div><dt>Climate</dt><dd>{label(plan.climate)}</dd></div>
            <div><dt>Laundry</dt><dd>{label(plan.laundryAccess)}</dd></div>
            <div><dt>Packed items</dt><dd>{plan.wardrobeItemIds.length}</dd></div>
          </dl>
          <div className="travel-activity-list">
            {plan.activities.map((activity) => <span key={activity}>{label(activity)}</span>)}
          </div>
        </aside>
      </header>

      {plan.notes ? (
        <section aria-labelledby="travel-notes-title" className="travel-private-notes">
          <div className="eyebrow">Private trip notes</div>
          <h2 id="travel-notes-title">Context you chose to keep.</h2>
          <p>{plan.notes}</p>
        </section>
      ) : null}

      {plan.packingWarnings.length > 0 ? (
        <section aria-labelledby="travel-warning-title" className="packing-warnings">
          <strong id="travel-warning-title">Coverage warnings saved with this plan</strong>
          <ul>
            {plan.packingWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="travel-packed-items-title" className="travel-packed-items">
        <div className="section-heading-row">
          <div>
            <div className="eyebrow">Final packing list</div>
            <h2 id="travel-packed-items-title">What you chose to take.</h2>
          </div>
          <span className="item-count">{plan.wardrobeItemIds.length} items</span>
        </div>

        <div className="travel-packed-grid">
          {plan.wardrobeItemIds.map((itemId, index) => {
            const item = itemMap.get(itemId);
            return (
              <article className="travel-packed-card" key={itemId}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="eyebrow">{item ? label(item.category) : "Unavailable item"}</div>
                  <h3>{item?.name ?? "Wardrobe item no longer available"}</h3>
                  {item ? (
                    <>
                      <p>{item.brand ?? "Brand not recorded"} · {item.primaryColor}</p>
                      <Link className="text-link text-link-dark" href={`/wardrobe/${encodeURIComponent(item.id)}`}>
                        Inspect wardrobe item
                      </Link>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="travel-detail-footer">
        <div>
          <strong>Private owner-scoped plan</strong>
          <span>Revision {plan.revision}. No coordinates, bookings, calendar, or live weather are stored.</span>
        </div>
        <TravelPlanDeleteButton planId={plan.id} revision={plan.revision} />
      </footer>
    </div>
  );
}
