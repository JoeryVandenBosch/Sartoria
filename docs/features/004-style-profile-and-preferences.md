# Style Profile and Preferences

## Outcome

A signed-in user can create, review, correct, export, and reset a private style profile that gives future outfit and recommendation features explicit, user-controlled constraints.

## Scope

- fit preference;
- broad climate context;
- recommendation mode;
- style directions;
- preferred and avoided colours;
- preferred and avoided brands;
- excluded materials;
- optional height, chest, waist, inseam, and EU shoe size;
- explicit control over whether measurements may influence recommendations;
- profile revision and optimistic concurrency;
- owner-scoped PostgreSQL and development repositories;
- create/update form;
- JSON export;
- destructive reset with confirmation;
- deterministic behavior without AI;
- privacy-safe validation and observability;
- automated domain, application, repository, transport, and end-to-end tests.

## Acceptance criteria

1. A missing profile is valid and renders an empty, usable form.
2. Every read, write, export, and reset operation uses the authenticated owner identifier.
3. A user cannot read, overwrite, export, or reset another user’s profile.
4. Profile updates require the expected revision and reject stale writes.
5. Fit, climate, recommendation mode, style direction, colour, and material values use controlled allowlists.
6. Style directions contain no duplicates and are limited to eight selections.
7. Preferred and avoided colours cannot overlap.
8. Preferred and avoided brands are trimmed, deduplicated case-insensitively, limited to 20 values per list, and cannot overlap.
9. Optional measurements use metric base units and plausible product bounds.
10. Measurements are ignored by recommendation consumers unless `useMeasurementsForRecommendations` is explicitly enabled.
11. The interface does not request precise location.
12. Saving a profile does not require AI or an external service.
13. Export returns only the authenticated user’s canonical current profile as JSON with private no-store headers.
14. Reset deletes the profile after explicit confirmation and leaves no active profile record.
15. The profile is never silently updated from wardrobe images, browsing behavior, or AI output.
16. No measurements, brands, preference values, or exported profile content are written to operational logs.
17. Production persists through PostgreSQL with forced row-level security; development uses an explicit deterministic adapter.
18. Lint, strict TypeScript, tests, production build, and profile end-to-end checks pass.

## Recommendation modes

- `wardrobe-first`: prioritize combinations from owned items and discourage purchases.
- `balanced`: use owned items first while allowing clearly justified gaps.
- `shopping-open`: allow purchase suggestions when they materially improve coverage.

The selected mode changes recommendation policy only. It never triggers a purchase or changes wardrobe state.

## Measurement privacy

Measurements are optional. The form explains why each value may be useful. A separate switch controls whether stored measurements may be consumed by recommendation logic. Turning the switch off retains the values for user reference but excludes them from recommendation inputs.

## Export format

The export contains:

- schema version;
- profile revision;
- canonical preference values;
- optional measurements;
- measurement-use control;
- creation and update timestamps.

It excludes authentication records, sessions, wardrobe items, media, prompts, and provider data.

## Reset behavior

Reset is a destructive, owner-scoped profile deletion. It does not delete the account, wardrobe, media, or outfits. Future account deletion will orchestrate deletion across all modules.

## Out of scope

- body or face analysis;
- automatic profile inference;
- image-derived measurements;
- precise location or continuous weather tracking;
- AI-generated preference updates;
- shopping transactions;
- social profile sharing;
- historical profile revision browsing;
- account-wide export or deletion orchestration.
