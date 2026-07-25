# ADR 0001 — Application Foundation

## Status

Accepted

## Context

Sartoria needs a production-oriented web foundation for the first complete vertical slice while preserving modular-monolith boundaries, deterministic core workflows, privacy, accessibility, and provider-neutral AI integration.

The repository already establishes Next.js, TypeScript, React server components, PostgreSQL, private object storage, background jobs, and structured AI boundaries as the initial direction.

## Decision

Use:

- Node.js 24 LTS for development and CI;
- Next.js 16 with the App Router;
- React 19;
- TypeScript strict mode;
- ESLint with the Next.js Core Web Vitals and TypeScript configurations;
- Vitest for fast domain and application tests;
- Zod at transport and external-data boundaries;
- CSS custom properties and repository-owned styles for the initial design foundation.

Start with domain and application layers that have no Next.js, persistence, storage, analytics, or AI provider imports.

Do not select the PostgreSQL ORM, authentication provider, object-storage provider, job runner, analytics provider, or AI provider in this ADR. Each requires evidence and a separate ADR before becoming difficult to replace.

## Consequences

### Positive

- The scaffold matches approved product and architecture direction.
- Domain logic remains independently testable.
- The first slice can be built without waiting for AI or external infrastructure.
- The stack uses current stable platform releases and an active LTS runtime.
- Styling remains controlled by the Sartoria design language without committing to a broad UI framework.

### Negative

- Persistence and authentication are initially represented by explicit interfaces or development adapters.
- Additional ADRs are required before production infrastructure choices.
- Dependency updates must be governed and validated continuously.

## Validation

The foundation must pass linting, strict type checking, unit tests, and a production build in CI. The first vertical slice must demonstrate that domain behaviour remains independent from framework and infrastructure code.
