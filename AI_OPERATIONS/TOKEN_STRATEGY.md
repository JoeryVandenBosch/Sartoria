# Sartoria Token Strategy

Use tokens for decision-relevant evidence, not repeated narration.

## Rules

- Search before reading large documents.
- Load targeted sections before complete files.
- Do not re-read unchanged canonical documents in the same work phase.
- Keep one concise working record of scope, decisions, risks, and validation.
- Store durable decisions in ADRs, specifications, tests, and code comments where justified.
- Prefer exact file references over pasted repository content.
- Avoid generating roadmaps when an approved roadmap already exists.
- Avoid verbose progress narration when repository actions are possible.
- Split large work into complete vertical slices rather than accumulating broad context.

## Context budgets

- Risk 0–1: repository identity, task contract, affected implementation, and tests.
- Risk 2: add architecture, operations, and affected security or privacy context.
- Risk 3–4: add independent review context, related ADRs, rollback, migration, and broader impact evidence.

Budgets are expansion boundaries, not fixed token counts. Expand only when unresolved uncertainty affects correctness or safety.

## Summaries

A summary may replace a large document only when:

- it is repository-controlled;
- it identifies source files and freshness;
- the task does not depend on omitted detail;
- the agent can open the source when uncertainty arises.

## Session continuity

End each work session with a repository-grounded handoff containing objective, completed scope, commits, decisions, tests, risks, and exact next action. Do not depend on chat memory.

## Model interaction

Do not compensate for poor context selection by escalating model size. Reduce noise, isolate the decision, load missing evidence, and only then select a stronger model when task complexity requires it.
