# Feature 005 — Manual Outfit Composition

Status: implementation ready  
Risk: 2 — private owner-scoped composition data with relational wardrobe references

## User outcome

A signed-in user can combine existing wardrobe items into a named private outfit, review the composition, and return to it later without relying on AI.

## In scope

- create a private outfit from two to twelve owned wardrobe items;
- set a name, optional occasion, and optional private styling note;
- list the current user's outfits newest first;
- open an outfit detail page;
- link each component back to its wardrobe item;
- reject duplicate, missing, archived, or cross-owner item references;
- deterministic development persistence;
- PostgreSQL persistence with forced RLS;
- optimistic revisions and owner-scoped deletion foundation;
- responsive and accessible composition UI;
- privacy-safe diagnostics and validation.

## Out of scope

- AI-generated outfits;
- automated compatibility scoring;
- weather or calendar integration;
- wear history;
- social sharing;
- public outfit URLs;
- shopping recommendations;
- drag-and-drop ordering;
- outfit image generation.

## Acceptance criteria

### Create

1. The user can enter an outfit name between 1 and 120 characters.
2. The user can optionally enter an occasion between 1 and 80 characters.
3. The user can optionally enter a private styling note of at most 1,000 characters.
4. The user must select at least two and at most twelve distinct wardrobe items.
5. Every selected item must exist, belong to the current user, and not be archived.
6. The server ignores or rejects any client-supplied ownership identity.
7. A successful create redirects to the owner-scoped outfit detail page.

### List

1. `/outfits` lists only the current user's outfits.
2. Results are ordered newest first.
3. Each card shows the outfit name, optional occasion, item count, and creation date.
4. An empty state explains how to create the first outfit.

### Detail

1. `/outfits/[outfitId]` returns not found for absent or inaccessible outfits.
2. The detail page shows every component item with category, brand, and colour context.
3. Each component links to its owner-scoped wardrobe detail page.
4. The private styling note is visible only on the authenticated owner's detail page.
5. Ready owner-authorised media may be shown; media absence does not block the outfit.

### Integrity

1. Duplicate item identifiers are rejected.
2. Archived wardrobe items cannot be newly added.
3. Deleting or archiving source items must not silently create a cross-owner reference.
4. Persistence uses optimistic revision checks for future edit and delete operations.
5. PostgreSQL enables and forces RLS on outfit tables.
6. Join-table foreign keys include owner identity.

### Accessibility

1. Every input has a programmatic label.
2. Item selection uses native checkboxes.
3. Validation messages use live regions or alert semantics.
4. The workflow is fully keyboard operable.
5. Focus states remain visible.

### Validation gate

- ESLint passes;
- strict TypeScript passes;
- domain and application tests pass;
- transport and ownership tests pass;
- production build passes;
- Chromium end-to-end create/list/detail flow passes;
- Security and Privacy review is recorded before merge.

## Rollback

Hide the Outfit navigation and disable the outfit routes. Preserve existing tables and records unless an approved forward migration or restore process is used.
