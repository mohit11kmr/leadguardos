# V6 Shared Type Inventory

Phase 3A inventory only. These types are additive contracts; current runtime types remain in place until migration.

| Type | Current source | Why shared | Consumers |
|---|---|---|---|
| `ActorRole`, `ActorContext`, `AuthSource` | `server/auth/authService.ts`, `server/middleware/auth.ts` | one actor shape must cross API, worker, and web boundaries | API middleware, web session, worker ownership |
| `AuditResult` | `src/types.ts`, `server/scannerEngine.ts` | audit result crosses scanner/API/web/report boundaries | Audit service, Reports, Intelligence, Web |
| `AuditFinding` | `src/types.ts` `AuditIssue`; `server/storage.ts` | findings are the stable evidence unit | detectors, score, AI, reports, web |
| `PillarScore` | `src/types.ts` `PillarScoreData`; `server/scannerEngine.ts` | score projection is rendered by web and consumed by intelligence | Audit, Intelligence, Reports, Web |
| `BusinessImpact` | `AuditResult.estimatedMonthlyLoss`, `src/utils/revenueModel.ts` | measured/estimated/derived impact must be explicit at boundaries | Audit, Intelligence, Reports, Web |
| `MonitoringTarget` and `MonitoringStatus` | `server/storage.ts`, `server/repositories/watchdogRepository.ts` | monitoring commands/status cross API and worker | Monitoring API/worker/Web |
| `Report`, `ReportShare` | `server/reports/*`, `server/repositories/pdfReportRepository.ts` | public/share/PDF contracts cross API, worker, and web | Reports API/worker/Web |
| `BillingPlan`, `Order`, `Payment`, `Entitlement` | `server/config/pricing.ts`, `server/repositories/orderRepository.ts`, Prisma schema | billing state and entitlements cross API, worker, and web | Billing API, payment worker, Web |
| `Webhook` | `server/storage.ts`, `server/repositories/webhookRepository.ts` | webhook registration and delivery cross API/worker | Developer, Monitoring, Worker |
| `JobEnvelope` and typed job payloads | `server/queue/jobQueue.ts`, `server/queue/executors/index.ts` | API producer and worker consumer need versioned payloads | API queue publisher, Worker |
| `SuccessResponse`, `ErrorResponse` | current `sendError` and route response variants | future envelope standardization without changing V5 responses | API, Web, contract tests |

## Intentionally Not Shared

Prisma generated types, Express request/response types, React props, browser APIs, repository implementations, provider SDK objects, and UI-only view state remain local to their owning application/domain.
