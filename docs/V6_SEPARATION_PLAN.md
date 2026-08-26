# V6 Separation Plan

## Goal

Separate the current repository into durable ownership boundaries so product, infrastructure, and data responsibilities are explicit.

## Move to web

- MarketingHome
- HeroScanner
- AuditCommandCenter
- FindingsDetailTabs
- FourPillarsOverview
- ScoreDashboard
- ReportsView
- PublicReportView
- PricingView
- BillingView
- AuthModal
- AccountSettingsView
- Navigation shell and view routing
- Theme and language presentation layer
- Client-side review and testimonial flows

## Move to API

- server.ts root route assembly
- server/middleware/auth.ts
- server/auth/authService.ts
- server/config/envValidator.ts
- server/config/pricing.ts
- server/services/paymentService.ts
- server/services/entitlementService.ts
- src/config/features.ts (or shared schema package)
- server/repositories/*
- server/api/v1.ts
- server/ssrfGuard.ts
- server/security/*
- scanner engine orchestration layer and entrypoints
- reportManager and share-link logic

## Move to worker

- worker.ts
- server/queue/jobQueue.ts
- server/queue/retryPolicy.ts
- server/queue/executors/index.ts
- AI analysis jobs
- generatePdf jobs
- watchdog run jobs
- webhook delivery jobs
- notification jobs
- triggered scheduling/retry loops

## Move to shared packages

- Audit result and issue schema types
- Payment pricing schema and plan contract
- User role and auth claims type
- report payload types
- queue contract types
- scanner result model
- domain-specific enums and constants

## Keep at root

- Dockerfile
- prisma.config.ts
- scripts/
- .github/
- CI and deployment config
- environment templates
- root README and operation docs

## Hidden coupling to watch for

1. The scanner engine is imported directly from the Express server, which means business logic is not fully isolated from request lifecycle.
2. The frontend uses direct knowledge of server-side concepts and feature registry values.
3. Local dev storage is still referenced in the same code paths as Postgres-backed storage.
4. Firebase initialization appears in frontend and server code, even though the code comments call it transitional.
5. Monitoring and scheduling logic is split between storage, scheduler, queue, and repository classes.
6. Payment and fulfillment logic can be triggered from UI, server, and repo layers without a single contract boundary.
7. Public report access and scan-by-id access share a route pattern but not a single data-access policy.

## Migration principle

The API boundary should be the authoritative boundary; the web app should consume only API contracts. The worker should own asynchronous work, not the API process.
