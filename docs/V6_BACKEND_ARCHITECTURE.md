# LeadGuard OS V6 Backend Architecture

## Target Structure

```text
apps/api/src/
  server.ts              environment, app construction, listen, shutdown
  app.ts                 Express middleware, security, CORS, route registration, errors
  routes/                thin transport adapters grouped by domain
  controllers/           request-to-command/query mapping
  middleware/            auth context, request ID, validation, rate limits
  domains/
    identity/ audit/ intelligence/ monitoring/ reports/
    billing/ agency/ developer/ admin/
      commands.ts queries.ts policies.ts services.ts repositories.ts events.ts
  infrastructure/
    database/             Prisma client, transactions, repositories/adapters
    storage/              object storage and legacy read-only adapters
    external/             AI, payment, notification, URL fetch providers
    logging/              logger, audit events, metrics
    security/             server-only composition of shared security primitives
  config/                  validated environment and service config
```

## Application Layers

1. Routes parse method/path and delegate; no business rules.
2. Controllers translate HTTP input to typed commands and choose response DTOs.
3. Middleware establishes request ID, canonical actor, role/permission, rate limit, and schema validation.
4. Domain services enforce business invariants and call repository interfaces.
5. Infrastructure implements database/provider interfaces and is injected into domain composition.
6. Event/job publishers create durable contracts; the worker consumes them.

Domain code receives interfaces such as `ScanStore`, `PaymentProvider`, `ObjectStore`, and `JobPublisher`; it does not import Express, Prisma, Firebase, or environment globals.

## `server.ts`

Only: load validated environment, build dependencies, call `createApp`, start the HTTP listener, install graceful shutdown, close Prisma/provider resources on SIGTERM/SIGINT. It does not register routes, start Vite, execute scans, or start the worker.

## `app.ts`

Owns Express initialization, request ID, raw-body handling for signed webhooks, JSON limits, security headers, CORS allowlist, request logging/redaction, health/readiness routes, auth middleware composition, route registration, 404 handling, and final error mapping. It does not calculate prices, inspect findings, or access repositories directly.

## Domain API Services

- Identity: `register`, `login`, `refresh`, `logout`, `getCurrentUser`, API-key lifecycle, permission resolution.
- Audit: `createAudit`, `getAudit`, `listAudits`, `getFindings`, `getAuditStatus`, demo preset adapter.
- Intelligence: `getDashboard`, `getRevenueImpact`, `getFunnelInsights`, evidence-backed competitor analysis.
- Monitoring: `createTarget`, `listTargets`, `pauseTarget`, `deleteTarget`, `getCheckLogs`, `scheduleDueTargets`.
- Reports: `getReport`, `createShare`, `revokeShare`, `requestPdf`, `downloadPdf`, public projection.
- Billing: `listPlans`, `createOrder`, `verifyPayment`, `processProviderWebhook`, `getEntitlements`, `getOrders`.
- Agency: workspace/client/prospect commands, batch audit command, white-label report request.
- Developer: scoped API key and webhook commands, external API DTOs, OpenAPI generation.
- Admin: operational read models and explicit support/policy commands that call domain services.

## Canonical Error and Response Contract

Success responses use `{ "success": true, "data": ..., "meta": { "requestId": "..." } }`; list responses may add `pagination`. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "requestId": "...", "details": ... } }`. During migration, compatibility adapters preserve legacy bodies for old paths; new `/api/v1` endpoints use the standard envelope. No error includes secrets, raw provider responses, or internal stack traces.

## Synchronous vs Asynchronous Rule

API may perform authentication, validation, small reads, share-token creation, and short metadata mutations. Website scans, batch scans, runtime/mobile checks, AI remediation, PDF generation, watchdog probes, notifications, webhook delivery, and recovery/reconciliation are worker jobs. The API returns `202` plus a job/resource ID when completion is not bounded to the request timeout.

## Infrastructure Migration Constraints

PostgreSQL repositories become the only production implementations. Firebase/local JSON adapters may exist only behind a compatibility interface, with read-only or migration-only flags. All outbound URLs pass shared SSRF validation. Payment provider access occurs only in Billing infrastructure. Object bytes are stored externally; metadata and authorization remain in PostgreSQL.
