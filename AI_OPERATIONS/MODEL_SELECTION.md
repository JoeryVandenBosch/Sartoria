# Sartoria Model Selection

Select models by capability, risk, ambiguity, and verification cost. Exact provider identifiers must be verified in the active environment before use.

## Workhorse tier

Use the capable general implementation tier, such as a verified Sonnet-class model, for:

- well-scoped implementation under established architecture;
- routine refactoring;
- unit and integration tests;
- documentation;
- straightforward defect fixes;
- low-to-medium risk work with objective validation.

## Deep-reasoning tier

Use the strongest verified reasoning tier, such as an available Opus-class model, for:

- architecture and major data decisions;
- ambiguous product trade-offs;
- complex cross-module debugging;
- security- and privacy-critical reasoning;
- migrations and destructive-change analysis;
- recommendation-quality policy;
- risk level 3–4 review;
- synthesis across many canonical artefacts.

## Specialist tier

Use a specialist model only after its capabilities and availability are verified. A requested identifier such as Fable 5 must not be assigned invented capabilities. Route it only through a documented, tested project configuration.

## Provider-neutral mapping

Every provider configuration maps available models to:

- `fast`: bounded extraction, classification, formatting, and mechanical edits;
- `workhorse`: routine implementation and verification;
- `deep`: architecture, ambiguity, security, difficult debugging, and independent review.

## Escalation

Escalate to a stronger tier when uncertainty remains after targeted context expansion, when failure impact is high, or when independent review requires deeper synthesis.

Do not use a stronger model merely because more repository context was loaded. Reduce context first, then escalate only when task complexity justifies it.

## Fallback

When the preferred model is unavailable:

1. preserve the required capability tier;
2. select an equivalent verified model from another provider;
3. reduce task scope when equivalent capability is unavailable;
4. require additional human or independent review for high-risk work;
5. record the substitution in the handoff.
