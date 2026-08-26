# LeadGuard OS V6 Domain Boundaries

## Domain Contract

Each domain owns business rules, application services, persistence interfaces, events, and API handlers for its facts. Shared packages contain contracts, not business ownership.

| Domain | Responsibilities and rules | API ownership | DB ownership | Worker responsibilities | Web surface | External dependencies | Allowed | Forbidden |
|---|---|---|---|---|---|---|---|---|
| Identity | users, sessions, refresh rotation, roles, service accounts, API keys, ownership context | `/v1/auth`, `/v1/me`, key management | `User`, `RefreshToken`, `ApiKey` | token/session cleanup, security events | auth, account, settings | PostgreSQL, crypto | schemas, security, config | React, scanner, payment provider |
| Audit | scan lifecycle, URL policy invocation, detector orchestration, findings, score | `/v1/audits`, legacy scan compatibility | `Scan`, `AiReport` (audit result) | live/batch scan, AI analysis | audit workspace, findings, fix center | safe fetch, optional AI | identity contracts, scanner infrastructure | billing UI, direct Prisma from detectors |
| Intelligence | revenue impact, executive aggregates, funnel/zero-intent analysis, evidence-derived insights | `/v1/intelligence` | derived read models/stats; no duplicate scan truth | aggregate rebuilds, competitive jobs only when productized | executive, funnel, revenue, competitive | audit result, analytics | audit query contracts | changing scan facts, payment verification |
| Monitoring | target lifecycle, schedules, probes, incident state, notification intent | `/v1/monitoring` | `Watchdog`, `WatchdogCheckLog` | watchdog probes, incident evaluation, scheduling | monitoring, schedules, alerts | audit service, queue, notification providers | identity, audit result contracts | React, billing provider calls |
| Reports | report projection, export, share tokens, public access policy, PDF metadata | `/v1/reports`, `/report/*` compatibility | `ReportShare` if introduced, `PdfReport`, scan projection | PDF generation, export packaging | reports, public report, share modal | object storage | audit read contracts, identity policy | mutating scan facts, pricing |
| Billing | plans, prices, orders, payment state, verification, fulfillment, entitlements | `/v1/billing`, payment webhooks | `Order`, `Payment`, `PaymentEvent`, `Fulfillment`, `Subscription`, `Entitlement`, `UsageRecord` | reconciliation and fulfillment recovery | pricing, checkout, billing | Razorpay/other provider, crypto | identity, schemas, security | client-supplied amounts, UI authority |
| Agency | organization/workspace, clients, prospects, white-label reports, agency entitlements | `/v1/agency` | future organization/client tables; existing `organizationId` links remain transitional | batch prospect scans, pitch jobs, white-label PDF jobs | agency workspace, clients, hunter, pitch | audit, intelligence, reports, AI | identity membership and entitlements | global unscoped scans, direct payment verification |
| Developer | public API contract, service accounts, API key scopes, webhook registration/docs | `/v1/developer`, `/v1/openapi.json` | `ApiKey`, `Webhook`, `WebhookDelivery` | webhook delivery and retry | developer portal, API docs | external webhook endpoints | identity, schemas, security | treating API key as admin role, raw repository access |
| Admin | operational views, moderation, support, policy overrides, audit logs | `/v1/admin` | read/write through owning domain services; audit log records | repair/replay/reconciliation commands | admin console | observability | all domain query contracts, explicit admin policy | bypassing domain invariants or ownership |

## Dependency Matrix

`C` means contract/query dependency, `E` means event dependency, `W` means write authority, and `-` means forbidden direct dependency.

| From / To | Identity | Audit | Intelligence | Monitoring | Reports | Billing | Agency | Developer | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Identity | W | C | C | C | C | C | C | C | C |
| Audit | C | W | E | E | C | C | C | E | C |
| Intelligence | C | C | W | C | C | C | C | - | C |
| Monitoring | C | C | E | W | E | C | C | E | C |
| Reports | C | C | C | C | W | C | C | C | C |
| Billing | C | - | C | C | C | W | C | - | E |
| Agency | C | C | C | C | C | C | W | C | C |
| Developer | C | C | - | C | C | C | C | W | C |
| Admin | C | C | C | C | C | C | C | C | W |

Direct writes to another domain's tables are forbidden. Admin writes must call the owning domain service and emit an audit event.

## Business Rule Placement

- Score calculation: Audit domain `ScoreAggregator`.
- Revenue calculation: Intelligence domain `ImpactCalculator`, using approved audit facts.
- Pricing: Billing domain catalog and server-side price resolver.
- Entitlements: Billing owns grants; Identity exposes the actor/claims contract.
- Monitoring status: Monitoring domain state machine.
- Report formatting: Reports renderers; report facts come from Audit/Monitoring contracts.
- Agency client ownership: Agency membership/policy service.
- Payment verification: Billing provider adapter and state machine.
- SSRF and outbound URL policy: shared security primitive invoked by Audit, Monitoring, Developer webhook delivery, and Billing provider adapters.
