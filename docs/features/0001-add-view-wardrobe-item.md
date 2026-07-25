# Feature 0001 — Add and View a Wardrobe Item

## Outcome

A signed-in user can record a private wardrobe item and view it in their wardrobe without depending on AI.

## Scope

The first slice includes:

- explicit user ownership;
- item identifier;
- category;
- name;
- optional brand;
- primary colour;
- ownership status;
- optional fit notes;
- creation timestamp;
- create-item use case;
- wardrobe list;
- item detail;
- transport validation;
- private ownership enforcement;
- deterministic behaviour without AI;
- unit and application tests;
- accessible empty, validation, and success states;
- privacy-safe operational events.

Image upload is represented by a separate media boundary and is delivered in the next slice. No image URL or provider SDK belongs in the wardrobe domain model.

## Categories

- outerwear;
- tailoring;
- knitwear;
- shirts;
- tops;
- trousers;
- denim;
- dresses;
- skirts;
- footwear;
- accessories;
- activewear;
- other.

## Ownership status

- owned;
- wish-list;
- archived.

The first user-facing workflow defaults to `owned`.

## Acceptance criteria

1. A valid item can be created for the active user.
2. Missing or invalid required fields produce field-level errors without creating an item.
3. Name and colour are trimmed and bounded.
4. Optional brand and fit notes are normalised and bounded.
5. A user can list only their own items.
6. A user cannot retrieve another user’s item by identifier.
7. Wardrobe browsing works when AI and all external providers are unavailable.
8. Domain and application layers do not import Next.js, database, storage, analytics, or AI provider SDKs.
9. Core interactions are keyboard accessible and use semantic form and error markup.
10. Logs and operational events contain identifiers and outcome metadata only, never fit notes or personal wardrobe content.

## Development adapter

Until persistence and authentication ADRs are accepted, the scaffold may use explicit development adapters behind application interfaces. These adapters must be visibly non-production, deterministic in tests, and replaceable without changing domain behaviour.

## Non-goals

- recommendation AI;
- automatic classification;
- image analysis;
- public sharing;
- purchase links;
- cost-per-wear;
- outfit generation;
- production authentication or persistence selection.

## Definition of done

The slice is complete when the acceptance criteria are implemented, automated tests pass, the production build succeeds, accessibility and privacy checks are documented, and any temporary development adapter is clearly isolated.
