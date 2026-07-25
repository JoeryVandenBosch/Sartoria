# Sartoria Context Loading

Load context incrementally. Search before broad reading and expand only when uncertainty or risk requires it.

## Level 0 — Repository identity

Always inspect:

- `AGENTS.md`;
- active agent instructions;
- current branch and latest commits;
- changed and affected files;
- `README.md` and the relevant section of `ROADMAP.md`.

## Level 1 — Task contract

Load:

- relevant feature specification;
- acceptance criteria;
- affected module documentation;
- active ADRs;
- existing tests and implementation patterns.

## Level 2 — Risk context

Load as relevant:

- `ARCHITECTURE.md`;
- `SECURITY.md`;
- privacy, ownership, consent, export, and deletion rules;
- media, AI, data model, deployment, and operations documentation;
- testing and accessibility requirements;
- rollback and migration guidance.

Identity, media, recommendations, AI gateway, migrations, infrastructure, export, deletion, and workflow changes require Level 2 context.

## Level 3 — Broad context

Load only when needed:

- neighbouring modules;
- historical ADRs;
- prior releases and migrations;
- broad governance documents;
- unrelated product areas.

## Reading rules

- Do not load the whole repository by default.
- Prefer exact files and targeted sections.
- Inspect existing code before designing replacements.
- Re-read changed canonical documents before final review.
- Refresh context after meaningful external changes or long implementation phases.
- Treat committed repository state as canonical.
- Do not substitute previous chat history for missing repository evidence.

## Completion context

Before delivery, reload the final diff, acceptance criteria, affected architecture and security constraints, relevant tests, and `AI_OPERATIONS/SELF_REVIEW_PROTOCOL.md`.
