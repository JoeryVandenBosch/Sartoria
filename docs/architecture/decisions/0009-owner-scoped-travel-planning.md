# ADR 0009 — Owner-Scoped Deterministic Travel Planning

Status: accepted  
Date: 2026-07-25  
Decision owners: Architecture, Product, Security, Privacy

## Context

Sartoria can now record owned wardrobe facts, private preferences, saved outfits, wear history, and explainable advice. The next capability is planning what to take for a trip without making packing dependent on a weather provider, calendar connection, or recommendation AI.

## Decision

Implement private travel plans as a deterministic owner-scoped domain module.

A travel plan contains:

- a generated identifier;
- an owner identifier resolved only on the server;
- a user-controlled trip name;
- an optional broad destination label;
- date-only start and end dates;
- a user-selected climate expectation;
- one or more activity contexts;
- laundry-access level;
- optional private notes;
- a packing list of owned wardrobe item identifiers;
- a monotonically increasing revision;
- created and updated timestamps.

The first packing list is produced deterministically from the owner's available wardrobe and explicit trip inputs. The user can review and change the selected items before saving. No external weather, calendar, location, or AI provider is required.

## Deterministic packing rules

The planner calculates trip length from date-only fields, caps the planning window, and derives category targets from:

- number of days;
- climate expectation;
- activity contexts;
- laundry access;
- available wardrobe categories;
- user-controlled preferred and avoided colours and brands where available.

The algorithm must:

- select only `owned` wardrobe items;
- never select cross-owner or archived records;
- prefer category coverage and repeatable combinations over maximum item count;
- avoid duplicate item identifiers;
- return a clear coverage warning when the wardrobe cannot satisfy a target;
- remain stable for the same inputs and wardrobe state;
- expose generated reasoning as explicit deterministic rules, not hidden reasoning.

## External climate boundary

Future climate or forecast enrichment must sit behind a provider-neutral interface. It is optional, separately approved, and cannot silently override the user's climate expectation. The initial slice stores no coordinates and makes no network request.

## Persistence

Use a `TravelPlanRepository` interface.

- Local development uses deterministic in-memory persistence.
- Production uses PostgreSQL with `travel_plans` and `travel_plan_items` tables.
- Both tables carry owner identity.
- Join-table foreign keys include owner identity.
- Row-level security is enabled and forced.
- Update and delete operations use optimistic revisions.

## UI

Provide:

- `/planning` for private plan history and a new-plan workflow;
- `/planning/[planId]` for owner-scoped plan and packing-list detail;
- date-only, climate, activity, laundry, destination, and note controls;
- deterministic packing preview with category targets and coverage warnings;
- explicit item checkboxes so the user controls the final list;
- edit and deletion foundations behind optimistic revisions.

## Security and privacy controls

- resolve owner identity only on the server;
- do not accept owner identifiers from forms or JSON;
- use broad destination text only and collect no coordinates;
- use date-only fields and collect no travel times, booking references, calendar tokens, or companion identities;
- cap trip duration, notes, activities, and packing-list size;
- verify every wardrobe identifier for owner and availability before persistence;
- force PostgreSQL RLS;
- use not-found semantics for inaccessible plans;
- exclude travel notes from logs, metadata, and recommendation-provider context unless a later explicit policy allows it;
- support owner-controlled deletion.

## Consequences

### Positive

- useful travel planning works offline and without AI;
- the user retains final control over packed items;
- future weather enrichment can be added without coupling the domain;
- packing lists are grounded in owned wardrobe facts;
- travel data remains minimal and owner-scoped.

### Trade-offs

- initial climate expectation is manually selected;
- deterministic category targets are conservative;
- no live weather, calendar, reservation, or route integration is included;
- automatic outfit scheduling is deferred.

## Rejected alternatives

### Require a weather API before planning

Rejected because external availability, location disclosure, forecast uncertainty, and provider policy should not block packing.

### Generate packing lists directly with a model

Rejected because core selection must remain owner-verifiable, deterministic, and usable without a provider.

### Store free-form destination and itinerary data without limits

Rejected because precise travel details are unnecessary for the first product outcome and increase privacy risk.

## Rollback

Hide the Planning navigation and disable travel-plan route surfaces. Preserve tables and user records after data exists. Use an approved forward migration, export, or restore process rather than dropping production data.
