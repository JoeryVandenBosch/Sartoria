# Style Profile Validation Gate

## Scope

Owner-scoped style profile and preference capture, optional measurements with explicit recommendation consent, export and reset controls, deterministic local persistence, PostgreSQL row-level security, and the premium `/profile` experience.

## Required validation

- dependency installation;
- linting;
- strict TypeScript checking;
- domain, transport, application, and repository tests;
- production build;
- Chromium installation;
- end-to-end profile save, export, and reset flow;
- independent security and privacy review.

## Merge rule

Merge only after the complete pull-request workflow is green. Fix only evidence-backed findings and preserve the owner-scoped privacy boundary.
