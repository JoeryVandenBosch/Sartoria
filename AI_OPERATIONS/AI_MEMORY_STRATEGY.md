# Sartoria AI Memory Strategy

The repository is durable memory. Chat history, temporary prompts, and model recollection are not canonical project state.

## Durable memory locations

- `VISION.md`: product outcomes, users, scope, and non-goals.
- `ROADMAP.md`: current delivery sequence and exit criteria.
- `ARCHITECTURE.md`: boundaries and quality attributes.
- `docs/architecture/decisions/`: material decisions and consequences.
- `docs/features/`: acceptance-ready feature contracts.
- `SECURITY.md`: security and privacy obligations.
- `AI_OPERATIONS/`: AI execution policy.
- tests: executable behavioural memory.
- migrations and schemas: data history.
- changelog and release notes: delivered history.

## Recording rules

Record a fact when it affects future implementation, review, security, operations, or product behaviour.

Use an ADR for difficult-to-reverse architecture, dependency, persistence, provider, deployment, or data decisions.

Use a feature specification for user-visible behaviour and acceptance criteria.

Use code comments only for local reasoning that cannot be made obvious by structure or naming.

## Handoffs

A handoff records:

- objective;
- completed scope;
- commits and files changed;
- decisions and ADRs;
- assumptions;
- validation and results;
- unresolved risks;
- exact next action.

## Freshness

Before relying on memory:

1. inspect the current repository state;
2. prefer the latest committed canonical artefact;
3. check active ADR status;
4. verify that summaries still match source documents;
5. update or remove stale guidance in the same change.

## Prohibited memory

Do not store secrets, production data, wardrobe images, measurements, prompt payloads, signed URLs, or personal user content in AI memory artefacts.
