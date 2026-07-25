# Sartoria Parallel Execution

Parallel agents are used only when work can be separated without conflicting ownership or hidden integration risk.

## Safe parallel work

Suitable examples:

- product specification and independent architecture review;
- domain implementation and isolated design-system work;
- implementation and independent test-plan preparation;
- documentation index updates and unrelated operational documentation;
- research that does not modify canonical project decisions.

## Ownership rules

Each parallel work item must define:

- one objective;
- owned files or modules;
- read-only dependencies;
- acceptance criteria;
- risk level;
- expected validation;
- handoff destination.

Two agents must not write the same file or redefine the same contract concurrently.

## Integration owner

One integration owner:

- verifies all handoffs;
- resolves contradictions against repository truth;
- reviews the combined change;
- runs cross-cutting validation;
- confirms architecture, privacy, accessibility, and brand consistency;
- owns the final commit sequence.

## Forbidden parallelisation

Do not parallelise tightly coupled changes involving:

- shared data migrations;
- authentication and ownership boundaries;
- consent, export, or deletion;
- media lifecycle and access;
- recommendation policies and AI schemas;
- the same ADR or canonical specification;
- irreversible infrastructure changes.

## Completion

Parallel work is incomplete until integrated behaviour, tests, documentation, and operational evidence are validated together. Individual agent success does not prove system-level completion.
