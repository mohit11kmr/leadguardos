# V6 Architecture Recommendation

## Recommendation

The V6 architecture should move toward a clean monorepo with explicit application boundaries:

apps/
  web/
  api/
  worker/
packages/
  types/
  schemas/
  config/
  security/

This recommendation is based on the actual repository, not on abstract best practice alone. The repo already contains a viable scanner and watchdog concept; V6 should make those domains explicit and remove migration overlap.

## Why this structure fits this codebase

The current project already behaves like a hybrid monolith with subdomains. It has:
- a web frontend shell,
- an Express API layer,
- a worker process,
- Prisma/Postgres as the strongest data authority,
- shared security logic,
- domain-specific repositories and services.

The repo is therefore already close to a split-package domain model. The main missing piece is discipline: not every module should sit in one app. V6 should make ownership explicit so boundary violations are harder to create.

## What moves

### Move to apps/web
- marketing landing page experience
- public scanning UX
- dashboard shell and domain views
- auth UI and client flows
- report presentation and share flows

### Move to apps/api
- route definitions and request validation
- auth middleware and policy enforcement
- scanner orchestration entrypoints
- payment order and verification handling
- user, report, watchdog, and role-aware endpoints

### Move to apps/worker
- queue processing
- watchdog execution jobs
- notification dispatch
- PDF generation
- AI analysis jobs
- retry, recovery, and dead-letter processing

### Move to packages/
- shared types and result models
- scan result schema
- database DTO schema
- pricing catalog
- security primitives
- email/notifications contracts

## What stays at the root

Only repo-level tooling should remain at root:
- CI config
- Docker and deployment config
- scripts
- environment validation and common package management
- monorepo tooling

## Domain boundaries

### Identity domain
Responsibilities:
- auth sessions
- user records
- role membership
- refresh tokens and API keys
- entitlement state

### Audit domain
Responsibilities:
- scan orchestration
- detector execution
- score aggregation
- issue conversion and findings
- report generation inputs

### Monitoring domain
Responsibilities:
- watchdog target lifecycle
- scheduler logic
- job queue contracts
- alert delivery
- check logs and incident state

### Reports domain
Responsibilities:
- share links
- public token access
- PDF generation
- export packaging

### Billing domain
Responsibilities:
- pricing
- payment order creation
- verification and webhook processing
- fulfillment + entitlements

### Agency domain
Responsibilities:
- project/workspace and client sets
- prospect management
- white-label output
- pitch generation

### Developer domain
Responsibilities:
- API keys
- webhook registration
- docs and external integrations

## Database ownership

PostgreSQL should be the single source of truth in V6.

Canonical ownership:
- User and auth tables: Identity domain
- Scan, findings, and AI report tables: Audit domain
- Watchdog and watchdog logs: Monitoring domain
- ReportShare, PdfReport: Reports domain
- Order, Payment, PaymentEvent, Fulfillment, Entitlement: Billing domain
- Webhook and WebhookDelivery: Developer domain

No local JSON / Firestore storage should be authority. Legacy adapters should remain read-only or migration-only.

## Worker boundaries

The worker should own:
- AI jobs
- PDF jobs
- monitor probes
- webhook dispatch
- notification retries
- scan execution that is asynchronous or long-running

The API should not execute heavy work directly except for short-lived request/response work.

## Deployment model

Recommended deployment model:
- web app served as a frontend app in one deployment
- API as a separate service
- worker as a separate long-running process
- PostgreSQL as the shared persistence layer
- object storage for reports and attachments if needed

This fits the current code’s underlying architecture better than a pure single-process monolith.

## Final V6 recommendation

Keep the product core:
- audit
- monitoring
- reporting
- billing

Reframe the surrounding features as explicit domains rather than loaded into a single app.

This is the correct move because the repo already contains the interesting product value; the next step is boundary enforcement, not feature creation.
