# LeadGuard OS V6 Phase 3 Execution Plan

This is an implementation order, not an implementation. Phase 3 must stop after any failed gate and preserve the last green checkpoint.

## Phase 3A Status

**Complete on 2026-08-27.** The additive contracts, schemas, fixtures, boundary checker, environment manifest, and compatibility suite are present. No Phase 3B application migration has started; V5 runtime behavior, routes, schema, authentication, payments, scanner, and CSS remain unchanged.

Checkpoint: `v6/02-contracts` (working-tree checkpoint; commit after all required gates pass).

## Preconditions and Checkpoints

1. Freeze V5 behavior: tag the current baseline, record API fixtures, public report URLs, payment test fixtures, scanner golden results, and current environment contract.
2. Create checkpoint `v6/01-boundaries` with only scaffolding/config metadata; no behavior change.
3. Create `v6/02-contracts` for shared types/schemas and compatibility tests.
4. Create `v6/03-web`, `v6/04-api`, `v6/05-worker`, `v6/06-auth`, and `v6/07-data-cutover` only after their gates pass.

## Ordered Migration

### 1. Establish contracts without moving runtime code
Define audit, finding, score, actor, report, billing, monitoring, webhook, and job contracts in `packages/types` and Zod schemas in `packages/schemas`. Add contract tests against current responses. No production import changes yet.

### 2. Establish package/config/security boundaries
Create package ownership and one validated environment manifest. Extract pure SSRF, crypto comparison, redaction, request ID, and rate-limit interfaces. Keep current adapters behind the interfaces.

### 3. Create web shell in parallel
Create `apps/web` build entry and route table while V5 remains runnable. Move no component until the shell can render the existing landing and report URLs from the compatibility API.

### 4. Centralize frontend transport
Replace direct `fetch` usage incrementally with `api/client.ts` and domain clients. Add request IDs, normalized errors, one refresh retry, timeout, abort behavior, and typed response parsing. Verify `/api/scan`, history, config, features, report, monitoring, billing, and auth consumers.

### 5. Split public and authenticated web routes
Move marketing, audit, report, pricing, and auth surfaces first. Add authenticated/agency/developer/admin layouts and server-authorized route loaders. Keep `/report/:id`, `/report/share/:token`, and public token semantics unchanged.

### 6. Create API `app.ts` and `server.ts` shell
`app.ts` owns middleware/routes/errors; `server.ts` owns startup/shutdown. Initially mount compatibility handlers around existing services. Do not start worker from API after worker checkpoint.

### 7. Move API route adapters by domain
Move identity, audit, monitoring, reports, billing, developer, agency, intelligence, and admin routes one group at a time. Preserve old aliases and route bodies through adapters. Add authorization and contract tests before deleting duplicate inline handlers.

### 8. Isolate Audit engine
Put `ScanService -> ScanOrchestrator -> detectors -> FindingBuilder -> ScoreAggregator -> AuditResult` behind interfaces. Preserve detector inputs, ordering, score weights, SSRF behavior, runtime/mobile checks, and scanner version. Add golden fixtures for WhatsApp, Phone, Forms, Meta Pixel, GA4, SEO, Security, and runtime/mobile detectors.

### 9. Make PostgreSQL authoritative
Run idempotent imports for users, scans, watchdogs/logs, reports/PDF metadata, orders/payments/events/fulfillments, entitlements/usage, API keys, and webhooks/deliveries. Reconcile counts, ownership, IDs, hashes, statuses, tokens, and payment state. Set legacy stores read-only and fail production startup if selected as authority.

### 10. Separate worker
Move queue adapter, scheduler, executors, retry policy, recovery, AI, PDF, notifications, webhooks, batch scans, and watchdog probes to `apps/worker`. API only publishes job contracts and queries status. Run API and worker with compatible contract versions during rollout.

### 11. Canonicalize identity
Introduce `ActorContext`, switch new and migrated routes to canonical JWT/refresh identity, isolate Firebase/legacy JWT adapters, remove Firebase role elevation, and add telemetry. Cut over browser auth only after login, refresh, logout, logout-all, ownership, role, and API-key tests pass.

### 12. Billing and entitlement cutover
Move catalog, server-side price calculation, order state machine, provider signature/amount/currency confirmation, payment-event idempotency, fulfillment exactly-once, subscriptions, usage, and entitlements into Billing. Frontend receives only price/entitlement projections. Run sandbox and forged/mismatch/replay tests.

### 13. Introduce explicit CORS and deployment separation
Deploy web, API, and worker separately in staging. Validate origins, secrets, health/readiness, queue leases, logs, metrics, object storage, webhook signatures, rate limiting, and graceful shutdown.

### 14. Regression and controlled production rollout
Run old/new route contract comparison, scanner golden tests, database integration, job recovery, public report, payment, agency, developer, admin, and critical E2E flows. Canary API/worker, monitor, then increase traffic. Retire compatibility paths only after deprecation evidence.

## Scanner Architecture and Contracts

Audit outputs contain normalized `scanId`, target URL/domain, mode, status, overall score, four pillar scores, findings, impact estimate, timestamps, and scanner version. Detectors receive a bounded `ScanContext` and return evidence-backed findings; detectors cannot write databases or call React. The score aggregator is the only score authority. AI receives approved findings only and stores input/result hashes and prompt version; unsupported claims are rejected.

## Report Architecture

`AuditResult -> ReportContract -> ReportRenderer(Web|PDF|PublicShare)`. Report data is immutable/read-projected; formatting is renderer-specific; PDF bytes are object-storage concerns; metadata and digest are Postgres concerns; public access is token/password/expiry policy owned by Reports. Existing public report URLs remain compatibility routes until all clients use `/v1/reports`.

## Billing State Flow

`Plan -> Price -> Order(PENDING) -> Provider Order -> Payment verification -> PaymentEvent dedupe -> PAID -> Fulfillment -> Entitlement`. Client amount/status is never trusted. Illegal transitions, provider mismatch, amount/currency mismatch, failed confirmation, duplicate events, and already-claimed fulfillment are explicit test cases.

## Agency Decision

Agency remains a domain and route/layout surface in the same web/API deployment during V6. It uses organization membership and entitlements, calls Audit/Intelligence/Reports through contracts, and uses worker jobs for batch scans, pitch generation, and white-label PDFs. A separate service is deferred until scale, isolation, and ownership justify the operational cost.

## Environment and Developer Workflow

- Web: `5173` in Vite dev, API base URL configurable; production static hosting.
- API: `3000` locally, `PORT` in deployment; depends on PostgreSQL and package config.
- Worker: separate process, no public port; depends on PostgreSQL/queue and provider credentials.
- PostgreSQL: local Docker `5432`; isolated test database/schema; managed staging/prod instances.
- Startup order: database available and migrations applied, API available, worker starts after queue schema is ready, web points to API.
- Local fallback stores may support tests/dev only and must be visibly selected; production requires `DATABASE_URL`.

Future CI pipelines run per app: install/lockfile validation, typecheck/lint, unit tests, contract tests, integration tests with PostgreSQL, build, Prisma migration check, security checks, artifact smoke test, and deploy. Worker additionally runs lease/retry/dead-letter tests; web runs route/public-report smoke tests.

## Test Strategy

- Unit: score/impact/pricing/state machines, detectors, schemas, policy, token hashing, SSRF, signature verification.
- Integration: API + PostgreSQL repositories, ownership, public shares, payment state, entitlements, object metadata.
- Contract: every current and target endpoint, legacy adapter body, error envelope, OpenAPI.
- Worker: every job contract, idempotency, retry classification, lease recovery, dead letter, provider rejection.
- E2E: landing -> scan -> result -> fix -> report -> monitoring; auth/refresh; payment; agency; developer API; public report; GDPR export/deletion.

## Rollback Strategy

Rollback is checkpoint-based and additive. If a slice fails, route traffic back to the last V5/new-compatible deployment, stop new worker consumers only after draining or requeueing leases, and keep PostgreSQL schema/data intact. Never reverse database migrations automatically. Restore from backup only for proven data corruption. Compatibility adapters remain until the new path has passed its gate. A rollback record must include checkpoint, affected jobs, migration batch, data reconciliation status, and follow-up repair plan.

## Phase 3 Exit Gate

A slice is complete only when behavior, security, ownership, persistence, observability, and rollback checks pass. The full migration is complete when old route aliases have zero active callers, Firebase/legacy auth has zero production use, local/Firestore stores are migration-only, all features have registry mappings, and web/API/worker deploy independently.

## Phase 2 Readiness Answers

- Can a developer execute Phase 3 without guessing? **YES**
- Are domain boundaries explicit? **YES**
- Is every major feature mapped? **YES**
- Is every important API mapped? **YES**
- Is every important database entity owned? **YES**
- Is the worker boundary explicit? **YES**
- Is authentication migration defined? **YES**
- Is rollback defined? **YES**

## Known Risks to Carry Forward

1. Existing `server.ts` has duplicate/overlapping route behavior and must be migrated with route-level contract tests.
2. Firebase/Firestore and local storage may contain records not represented identically in PostgreSQL; reconciliation needs rejected-row review.
3. Frontend-only or partial features such as competitor radar, sitemap, cart leakage, reviews, and schedules need explicit product acceptance rather than invented backend behavior.
4. Scanner and watchdog runtime cost can overload API if queue cutover is incomplete.
5. Payment, public-token, and AI-result migrations are high-integrity data operations and need independent rollback/replay evidence.
6. Current environment configuration has overlapping validators and optional provider keys; one manifest must be adopted before deployment separation.
