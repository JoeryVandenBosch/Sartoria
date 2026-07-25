# Sartoria Architecture

## Architecture style

Sartoria begins as a modular monolith. Product capabilities share one deployable application and one primary relational database, while domain ownership and dependency direction remain explicit.

This keeps the first product operationally simple without allowing UI, persistence, AI providers, or external services to become the domain model.

## Initial technology direction

- Next.js with the App Router
- TypeScript with strict compiler settings
- React server components by default
- PostgreSQL as the system of record
- Repository-controlled schema migrations
- S3-compatible object storage for wardrobe imagery
- Background job execution for image processing and long-running AI tasks
- Provider-neutral AI gateway with structured inputs and outputs
- OpenTelemetry-compatible logging, tracing, and metrics

Specific vendors and libraries require an ADR before they become difficult to replace.

## Domain modules

### Identity

Owns accounts, authentication linkage, sessions, consent, data export, deletion requests, and account lifecycle.

### Profile

Owns measurements, fit preferences, colour preferences, style direction, disliked items, brand preferences, climate context, and recommendation controls.

### Wardrobe

Owns garments, footwear, accessories, images, attributes, condition, status, acquisition metadata, usage history, and wardrobe organisation.

### Outfits

Owns outfit composition, saved looks, suitability, styling notes, user feedback, and wear history.

### Planning

Owns occasion planning, packing lists, trip context, calendar intent, weather constraints, and preparation workflows.

### Recommendations

Owns recommendation requests, candidate generation, ranking, explanation, confidence, exclusions, user feedback, and provider interaction records.

Recommendations may consume data from other modules through approved application interfaces. They do not own wardrobe or profile truth.

### Insights

Owns wardrobe gaps, duplicates, underused items, cost-per-wear calculations, coverage analysis, and purchase-impact analysis.

### Media

Owns upload orchestration, image metadata, transformations, malware scanning, retention, access control, and deletion propagation.

## Dependency direction

- UI and transport layers depend on application use cases.
- Application use cases depend on domain modules.
- Infrastructure implements domain and application interfaces.
- Domain modules do not import Next.js, database clients, object-storage SDKs, analytics SDKs, or AI provider SDKs.
- Cross-module writes occur through explicit application commands.
- Cross-module reads use documented query interfaces or read models.
- Shared code is limited to stable primitives such as identifiers, time, money, result types, and audit metadata.

## Data principles

- PostgreSQL is authoritative for user, wardrobe, outfit, planning, recommendation, and insight state.
- Object storage holds binary media; the database holds ownership and lifecycle metadata.
- Every user-owned record has an explicit owner and deletion path.
- AI prompts and responses are not treated as authoritative domain state.
- Derived AI output stores model, provider, policy version, input references, timestamp, and confidence where applicable.
- Sensitive profile and image data is not written to logs.

## AI integration boundary

The AI gateway accepts structured tasks and returns schema-validated results. Provider-specific prompts, SDKs, retries, and safety controls remain inside infrastructure adapters.

Every user-facing AI recommendation must support:

- source item references;
- a concise explanation;
- exclusions and constraints;
- confidence or uncertainty;
- user correction or rejection;
- deterministic fallback behaviour when AI is unavailable.

AI may recommend, classify, summarise, or explain. It may not silently alter wardrobe truth, measurements, consent, purchase state, or account state.

## Security and privacy

- Private wardrobe media is inaccessible without authenticated, authorised access.
- Signed media URLs are short-lived and purpose-limited.
- Uploads are validated and scanned before normal use.
- Secrets remain in managed secret storage.
- Administrative actions are audited.
- Account deletion removes or irreversibly disconnects user data according to the retention policy.
- External AI providers receive the minimum data required for the task.
- Production data is never used as development or prompt-test data without an approved anonymisation process.

## Quality attributes

### Trust

Recommendations are explainable, reversible, and visibly distinct from user-entered facts.

### Privacy

Wardrobe content is private by default, exportable, and deletable.

### Performance

Primary wardrobe browsing and outfit composition remain responsive without waiting for AI calls.

### Resilience

Core wardrobe and outfit workflows continue when AI, weather, image-processing, or analytics providers are unavailable.

### Accessibility

The product targets WCAG 2.2 AA for primary workflows.

### Maintainability

Modules have explicit ownership, tests at the correct boundary, and ADR-backed dependency changes.

## Deployment shape

The initial deployment consists of:

- one web application;
- one background worker process or managed job runner;
- one PostgreSQL database;
- one private object-storage bucket;
- managed authentication and secrets;
- observability and error reporting.

New services are introduced only when independent scaling, security isolation, availability, or ownership needs justify the operational cost.
