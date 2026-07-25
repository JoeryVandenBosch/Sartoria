import type { Metadata } from "next";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { getStyleProfileForOwner } from "@/modules/profile/application/query-style-profile";
import { getStyleProfileRepository } from "@/modules/profile/infrastructure/style-profile-repository";

import { StyleProfileForm } from "./style-profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Style profile",
  description: "Private fit, colour, brand, climate, and recommendation preferences.",
};

export default async function StyleProfilePage() {
  const ownerId = await getCurrentUserId();
  const profile = await getStyleProfileForOwner(ownerId, getStyleProfileRepository());

  return (
    <div className="page-frame profile-page">
      <header className="profile-hero">
        <div>
          <div className="eyebrow">Private style intelligence</div>
          <h1>Make the advice unmistakably yours.</h1>
        </div>
        <div className="profile-hero-copy">
          <p>
            Record fit, colour, brand, material, and climate preferences once. Sartoria will use
            only the controls you choose and will keep recommendation logic explainable.
          </p>
          <div className="profile-privacy-note">
            <strong>Private by design.</strong>
            <span>
              Your profile is owner-scoped. Optional measurements remain excluded from future
              recommendations until you explicitly enable them.
            </span>
          </div>
        </div>
      </header>

      <StyleProfileForm key={profile?.revision ?? 0} profile={profile} />
    </div>
  );
}
