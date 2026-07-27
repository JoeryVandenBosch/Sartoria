# ADR 0012 — Sartoria is a native mobile application distributed through the App Store

## Status

Accepted. Supersedes the web-only delivery assumption implicit in ADR 0001 and in the initial technology direction recorded in `ARCHITECTURE.md`.

## Context

Sartoria has been built for nine phases as a Next.js web application. `ARCHITECTURE.md` recorded the initial technology direction as "Next.js with the App Router" and "React server components by default", and every phase followed it.

The repository owner has confirmed that the intended product is a **native mobile application distributed through the Apple App Store**, and that this was the intention from the outset. That intention was never recorded in `VISION.md`, `README.md`, `ROADMAP.md`, `ARCHITECTURE.md`, or any feature specification. No governing document mentions the App Store, native delivery, or a mobile runtime.

This ADR exists so the platform can never again be an undocumented assumption.

The correction is affordable because of decisions already made. `ARCHITECTURE.md` requires domain and application layers to hold no framework or transport concerns, and that rule has been kept:

| Layer | Lines | Disposition |
|---|---|---|
| Domain and application (`src/modules/*/domain`, `src/modules/*/application`) | ~3,600 | Portable unchanged. Contains no React or Next import. |
| Infrastructure (`src/modules/*/infrastructure`) | ~3,500 | Becomes the API server. |
| Shared library (`src/lib`) | ~260 | Mostly portable; observability and rate limiting are server-side. |
| Web interface (`src/app`) | ~5,300 | Replaced by native screens. |

The wardrobe rules, outfit composition, recommendation provenance and fallback, factual insights, travel planning, media lifecycle, observability, and rate limiting are all framework-free TypeScript and move to a native client without modification. What is lost is the presentation layer.

## Decision

**Sartoria is a native mobile application built with React Native under Expo, served by the existing Next.js application acting as an HTTP API.**

### Client

Expo with React Native, TypeScript, and the existing domain and application modules imported directly.

### Server

The current Next.js application is retained as the API and as the operational surface. Route handlers under `src/app/api` become the client's interface. Server-rendered pages under `src/app` are retired once the equivalent native screens exist, not before.

### Distribution

Apple App Store, with TestFlight for closed beta.

## Alternatives considered

**Capacitor or Cordova wrapping the existing web application.** Rejected. It appears the cheapest route and preserves the entire interface, but Apple's App Store Review Guideline 4.2 (Minimum Functionality) rejects applications that are predominantly a repackaged website. The rejection would arrive after the work was complete, and remediation would mean the native rewrite anyway, with a wasted wrapper. A route whose cheapness depends on passing a review it is designed to skirt is not cheap.

**Native Swift with SwiftUI.** Rejected for now, not on merit. It offers the best achievable execution of the Italian-chic restraint the product is built around, and would be defensible later. It is rejected today because the interface would be written in a second language with no reuse of the TypeScript domain, doubling the maintained surface at the moment the product most needs to reach real users. Revisit if the native client becomes the dominant cost centre.

**Progressive web application with an installable home-screen presence.** Rejected. It cannot be listed in the App Store, which is the stated requirement, and Apple constrains background execution, notifications, and storage for installed web applications in ways that would shape the product around platform limitations rather than product intent.

**Remaining a web application.** Rejected by the repository owner without qualification.

## Consequences

### Retained

- Every domain and application module, and their tests.
- The PostgreSQL schema, migrations, repositories, and row-level security.
- Media quarantine, scanning, and owner-scoped private storage.
- Observability (Feature 0010) and rate limiting (Feature 0011). Both are server-side and unaffected.
- The provider-neutral recommendation gateway.

### Replaced

- All server-rendered pages, forms, and server actions under `src/app` outside `src/app/api`.
- Session handling moves from cookie-based server rendering to a token exchange appropriate for a native client. This is a security-sensitive change and requires its own ADR and review.
- File upload moves from browser form submission to the native image picker, retaining quarantine-first processing unchanged.

### New obligations

- An Apple Developer Program membership, and a macOS machine for builds and submission.
- App Store review, which is a gate no previous phase modelled. Privacy nutrition labels, an App Privacy report, and a public privacy policy become release blockers.
- Two deployment targets rather than one: an application binary and an API server, versioned independently. An old client must not break against a newer API, which introduces API versioning as a first-class concern.
- Accessibility, touch target sizing, and offline behaviour become product requirements rather than refinements.

### Costs accepted

- The web interface built through Phase 8A is superseded. It is retained as a working reference for what each native screen must do, and its end-to-end tests document the flows the native client must reproduce.
- Phase 7B's closed-beta work partly changes shape. Invitation-controlled onboarding (Feature 0012, specified but unimplemented) overlaps substantially with TestFlight, which provides invitation-based distribution natively.

## Notes on sequencing

The native client is a new delivery surface, not a rewrite of the product. The correct order is to stabilise the API contract first, then build native screens against it, then retire the web interface. Retiring the web pages early would remove the only working reference for behaviour the native client must reproduce, and the only end-to-end coverage that currently exists.
