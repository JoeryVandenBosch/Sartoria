# Claude and Figma Collaboration

## Availability

The repository owner has Figma connected to Claude. Claude may use that connection for Sartoria product and interface work when the connected Figma workspace and relevant files are accessible.

Figma availability is an external working capability, not a runtime dependency of the Sartoria application. The application must build, test, deploy, and operate without a Figma connection.

## Purpose

Use Figma to support:

- product-flow exploration;
- responsive screen and component design;
- interaction states and prototypes;
- accessibility and content review;
- design-system and token alignment;
- implementation handoff and visual acceptance.

Do not use Figma to redefine approved product scope, security boundaries, privacy rules, domain behaviour, persistence, authentication, or release requirements.

## Sources of truth

- `VISION.md`, `ROADMAP.md`, feature specifications, ADRs, `ARCHITECTURE.md`, and `SECURITY.md` remain authoritative for product behaviour, scope, architecture, security, and privacy.
- Approved Figma frames are authoritative for visual composition and interaction intent when their status is explicitly marked approved and they do not conflict with repository rules.
- The implemented application and automated tests are authoritative for currently shipped behaviour.
- A Figma mock-up is not implementation evidence, test evidence, deployment evidence, or release approval.

When repository documentation, approved Figma designs, and implementation differ, do not silently choose one. Determine which artefact is current, record the discrepancy, and update all affected sources in the same delivery slice when practical.

## Brand direction

Every Sartoria design must preserve:

- the crown-based identity;
- premium Italian-chic restraint;
- the slogan **Elegantia in Simplicitate**;
- calm hierarchy rather than decorative excess;
- practical elegance over trend-led fashion imagery;
- accessible contrast, typography, focus, form, error, and responsive states.

Do not replace the approved brand direction with a generic SaaS dashboard, fashion marketplace, social network, or editorial feed aesthetic.

## Working rules for Claude

1. Inspect existing connected Sartoria Figma files, pages, components, variables, and approved frames before creating new design work.
2. Reuse and extend the existing design system rather than creating a parallel component library.
3. Keep concepts clearly labelled as `Draft`, `Review`, `Approved`, `Implemented`, or `Deprecated`.
4. Use synthetic wardrobe data, synthetic names, and synthetic images only. Never copy production data, private wardrobe images, measurements, emails, travel details, signed URLs, tokens, or staging evidence into Figma.
5. Design the complete state set relevant to the feature: loading, empty, populated, validation, error, unavailable dependency, permission denial, destructive confirmation, success, keyboard focus, and responsive behaviour.
6. Preserve deterministic core workflows and make AI-generated or inferred content visibly distinguishable from user-entered facts.
7. Keep private-V1 scope. Do not introduce public profiles, feeds, follows, likes, comments, public wardrobe discovery, marketplace, advertising, or public sharing.
8. Do not generate code from Figma and commit it without reconciling it with Sartoria architecture, accessibility, component conventions, tests, and dependency policy.
9. Do not overwrite approved frames destructively. Create a revision or branch when the connected Figma workflow supports it.
10. Ask for human input only when a material product or brand decision is genuinely unresolved; make routine layout and component decisions from existing design rules.

## Design-to-code workflow

For interface work with meaningful visual or interaction impact:

1. Read the feature specification and repository constraints.
2. Inspect the existing application and connected Figma source.
3. Create or update the smallest complete flow in Figma when design clarification is useful.
4. Mark review status and retain links to the relevant file, page, section, and frames.
5. Implement with existing application components and tokens where possible.
6. Add accessibility and responsive behaviour in code rather than treating the static frame as sufficient.
7. Run the complete repository validation gate.
8. Compare the implemented UI with the approved frames and record intentional differences.
9. Update the Figma status to `Implemented` only after the merged application reflects the approved design.

Figma work is optional for changes with no meaningful visual or interaction impact. Do not delay infrastructure, domain, security, migration, or observability work merely to create decorative mock-ups.

## Handoff evidence

A delivery that uses Figma records:

- Figma file name and link;
- page, section, and frame names;
- design status;
- affected routes and application components;
- reusable components or variables added or changed;
- accessibility and responsive decisions;
- intentional differences between design and implementation;
- screenshots only when they contain synthetic, non-sensitive content;
- exact next design or implementation action.

Do not claim that Figma was reviewed, updated, or approved unless the connected file was actually accessed and the action occurred.