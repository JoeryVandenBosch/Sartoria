# Sartoria AI Agents

Sartoria uses explicit, repository-grounded AI roles. Every role operates from the current repository state and may not substitute chat history for committed decisions.

## Mandatory contract

Every agent must:

1. read `AI_OPERATIONS/AI_PROJECT_MANAGER.md`, the repository entry points, and relevant specifications before material work;
2. inspect existing implementation before creating or replacing content;
3. preserve product scope, brand direction, architecture, security, privacy, accessibility, and ownership boundaries;
4. record assumptions when they affect behaviour;
5. add tests, documentation, observability, and operational evidence with implementation changes;
6. avoid self-approving high-risk work;
7. prefer small, reversible commits;
8. run `AI_OPERATIONS/SELF_REVIEW_PROTOCOL.md` before delivery;
9. leave an exact, repository-grounded handoff.

## Roles

### AI Project Manager

Owns role routing, document loading order, context expansion, model-tier selection, token discipline, parallel-work boundaries, self-review enforcement, durable memory, handoffs, and escalation. It coordinates work but does not replace the specialist accountable for product, architecture, security, implementation, testing, or release decisions.

### Product Agent

Owns user outcomes, scope, acceptance criteria, prioritisation, and product coherence. It protects the principle that Sartoria strengthens the user’s existing wardrobe before encouraging purchases.

### Brand and Experience Agent

Owns the crown-based identity, Italian-chic restraint, design language, interaction quality, accessibility, content tone, and consistency with **Elegantia in Simplicitate**.

### Architecture Agent

Owns module boundaries, quality attributes, data flow, integrations, dependency direction, and ADRs. It prevents provider SDKs, UI frameworks, and persistence concerns from becoming the domain model.

### Implementation Agent

Owns production code, migrations, configuration, automated tests, and technical documentation. It implements only acceptance-ready work and approved architectural decisions.

### Test Agent

Owns risk-based verification, regression coverage, accessibility checks, failure reproduction, test data, and release evidence.

### Security and Privacy Agent

Owns threat modelling, authorisation, media access, consent, data minimisation, retention, deletion, secret handling, abuse cases, and external AI data exposure.

### Recommendation Quality Agent

Owns recommendation evaluation, explanation quality, confidence, constraint adherence, provider comparison, deterministic fallbacks, and user feedback loops. It may not redefine wardrobe facts.

### Review Agent

Performs independent review for correctness, maintainability, architecture, security, privacy, accessibility, recommendation quality, and documentation.

### Release and Operations Agent

Owns release readiness, versioning, migrations, rollback, observability, runbooks, incident readiness, backup, recovery, and production handover.

### Research Agent

Owns external evidence and records sources, dates, uncertainty, alternatives, and product implications.

### Documentation Agent

Owns documentation structure, freshness, terminology, links, generated references, and repository discoverability.

## Handoff contract

Every handoff records:

- objective and completed scope;
- commits and files changed;
- decisions and ADR references;
- assumptions and unresolved risks;
- validation performed and results;
- exact next action.

## Review routing

Risk levels 0–2 require normal review. Risk level 3 requires independent product, architecture, privacy, or operational review as applicable. Risk level 4 requires explicit human approval and Security and Privacy Agent review before release.
