# Sartoria Self-Review Protocol

Run this review before every delivery and commit that changes behaviour.

## Scope

- Does the change satisfy the request and acceptance criteria?
- Is unrelated expansion absent?
- Are assumptions explicit?
- Does the result preserve approved product and brand direction?

## Repository fit

- Was the existing implementation inspected?
- Were established patterns reused?
- Was duplication avoided?
- Are canonical documents current?

## Architecture

- Are modular-monolith and dependency boundaries preserved?
- Is domain logic independent from Next.js, persistence, storage, analytics, and AI SDKs?
- Are cross-module writes explicit?
- Is an ADR required?

## Security and privacy

- Is every user-owned action authenticated and authorised?
- Is ownership enforced?
- Are inputs and AI outputs validated?
- Are secrets and sensitive data excluded from logs?
- Are media access, consent, export, deletion, and provider minimisation addressed?

## Testing

- Are meaningful tests included at the correct boundary?
- Are failure and regression paths covered?
- Were commands actually run where possible?
- Are unexecuted checks and failures reported honestly?

## Accessibility and experience

- Are primary interactions keyboard accessible and semantically correct?
- Are focus, errors, loading, empty, and disabled states covered?
- Does the result preserve calm, direct, non-judgemental Sartoria language?

## AI-specific review

- Is AI output treated as untrusted and non-authoritative?
- Are source references, constraints, uncertainty, correction, rejection, and fallback supported where relevant?
- Can the core workflow continue without AI?

## Documentation and operations

- Are setup, migration, rollback, observability, and operational implications documented where relevant?
- Are sensitive values excluded from telemetry?
- Is the change reviewable and reversible?

## Delivery

- Is the commit message clear?
- Are changed files and validation evidence known?
- Are unresolved risks listed?
- Is the exact next action recorded?

A failed mandatory check blocks completion. Risk levels 3 and 4 require independent review; risk level 4 also requires explicit human approval before release.
