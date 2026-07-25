# Sartoria AI Decision Tree

## 1. Is the request grounded?

- Yes: continue.
- No: inspect repository evidence and relevant specifications.
- Still missing or contradictory: stop and escalate only the missing high-impact decision.

## 2. What role owns the work?

Select the primary role from `AI_AGENTS.md`. Add independent review roles when risk requires them.

## 3. What is the risk level?

- 0–1: bounded, reversible, low-impact.
- 2: meaningful behaviour or module change.
- 3: security, privacy, architecture, migration, external integration, or broad operational impact.
- 4: destructive, irreversible, production-sensitive, regulated, or high-consequence change.

## 4. What context is required?

Apply `CONTEXT_LOADING.md`:

- start at Level 0;
- add Level 1 for the task contract;
- add Level 2 for risk;
- use Level 3 only when unresolved uncertainty remains.

## 5. Which model tier is appropriate?

Apply `MODEL_SELECTION.md`:

- fast for bounded mechanical work;
- workhorse for established implementation and tests;
- deep for ambiguity, architecture, security, difficult debugging, and high-risk review.

## 6. Can work proceed autonomously?

Proceed when scope is approved, decisions exist, the change is reversible, and validation is available.

Stop when credentials, production data, destructive actions, conflicting requirements, missing risk-4 approval, or unsupported assumptions are required.

## 7. Is parallel execution safe?

Use `PARALLEL_EXECUTION.md`. Parallelise only independent ownership surfaces with one integration owner.

## 8. Is implementation complete?

Run repository commands, inspect the final diff, and apply `SELF_REVIEW_PROTOCOL.md`.

## 9. Is independent review required?

- Risk 0–2: normal review according to repository policy.
- Risk 3: independent reviewer plus security, privacy, or architecture review as relevant.
- Risk 4: explicit human approval and mandatory independent security/privacy review before release.

## 10. What becomes durable memory?

Update specifications, ADRs, tests, operations documentation, and the exact repository-grounded handoff according to `AI_MEMORY_STRATEGY.md`.
