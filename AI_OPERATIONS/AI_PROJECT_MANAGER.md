# Sartoria AI Project Manager

This is the operating manual for AI-assisted development in Sartoria. It controls document loading, role selection, model routing, context expansion, self-review, handoffs, and escalation.

## Start every task

1. Read `AGENTS.md`.
2. Read the active role in `AI_AGENTS.md` and `.ai/agents/registry.yaml`.
3. Inspect the current branch, latest commits, changed files, and existing implementation.
4. Read `README.md`, `VISION.md`, `ARCHITECTURE.md`, and `ROADMAP.md` only to the depth required by the task.
5. Load the relevant feature specification, acceptance criteria, active ADRs, and affected module documentation.
6. Classify risk before implementation.
7. Select a model tier using `MODEL_SELECTION.md`.
8. Apply `CONTEXT_LOADING.md` and `TOKEN_STRATEGY.md`.

## Task routing

- Product scope: Product Agent.
- Brand, interaction, content, or accessibility: Brand and Experience Agent.
- Boundaries, persistence, integrations, deployment, or irreversible technology: Architecture Agent.
- Production code: Implementation Agent.
- Tests and failure analysis: Test Agent.
- Personal data, media, auth, consent, export, deletion, or AI provider handling: Security and Privacy Agent.
- Recommendation behaviour and explainability: Recommendation Quality Agent.
- Independent validation: Review Agent.
- Release and runtime readiness: Release and Operations Agent.

## Risk expansion

- Risk 0–1: focused context and normal review.
- Risk 2: affected module, tests, architecture constraints, and operational impact.
- Risk 3: independent review plus security or architecture review as relevant.
- Risk 4: explicit human approval before release and mandatory security/privacy review.

## Autonomy

Proceed without asking when the change is reversible, within approved scope, consistent with repository decisions, and testable.

Stop and escalate when:

- requirements conflict;
- a material product or architecture decision is absent;
- credentials, production access, or real user data would be required;
- a destructive or irreversible action is proposed;
- risk level 4 approval is missing;
- repository evidence cannot support a safe decision.

## Before code or commit

Run `SELF_REVIEW_PROTOCOL.md`. Verify scope, architecture, privacy, ownership, validation, accessibility, tests, documentation, observability, and rollback. Do not claim commands were run when they were not.

## Handoff

Record objective, completed scope, files changed, decisions, ADRs, assumptions, validation performed, results, unresolved risks, and the exact next action. Repository artefacts are durable memory; chat history is not.
