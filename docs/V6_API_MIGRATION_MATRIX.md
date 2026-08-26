# LeadGuard OS V6 API Migration Matrix

New endpoints use `/api/v1` and the standard envelope. Existing endpoints remain compatibility adapters until frontend and external clients migrate. No current endpoint is removed in Phase 3.

| Current endpoint | Target endpoint | Compatibility | Auth | Owner | Notes |
|---|---|---|---|---|---|
| `GET /api/health` | `GET /api/v1/health` | keep old alias | public | Admin/Platform | unify duplicate health handlers |
| `GET /api/ready` | `GET /api/v1/ready` | keep old alias | public | Platform | DB/queue readiness |
| `GET /api/metrics` | `GET /api/v1/admin/metrics` | old alias | ADMIN | Admin | operational metrics |
| `GET /api/features` | `GET /api/v1/config/features` | old alias | public | Platform | feature registry |
| `GET /api/config` | `GET /api/v1/config` | old alias | public | Platform | browser-safe config only |
| `GET /api/scan-stats` | `GET /api/v1/intelligence/stats` | old alias | public/USER | Intelligence | derived aggregate, no local authority |
| `POST /api/scan-stats/increment-fix` | `POST /api/v1/audits/:id/fixes` | old alias | USER | Audit | increment only after authorized fix |
| `POST /api/demo-scan` | `POST /api/v1/audits/demo` | old alias | public | Audit | explicit demo adapter, no production persistence |
| `POST /api/scan` | `POST /api/v1/audits` | old alias | optional USER | Audit | same live scan semantics; async when required |
| `GET /api/scans/history` | `GET /api/v1/audits` | old alias | optional USER | Audit | public response is sanitized |
| `GET /api/scan/:id` | `GET /api/v1/audits/:id` | old alias | optional USER | Audit | owner/admin/public-share policy |
| `GET /api/scan/:id/export` | `GET /api/v1/audits/:id/export` | old alias | USER/ADMIN/share | Reports | export DTO, not raw storage |
| `GET /api/report/:token` | `GET /api/v1/reports/public/:token` | preserve exactly | public token | Reports | public report compatibility required |
| `GET /report/share/:token` | `GET /api/v1/reports/share/:token` plus old alias | preserve browser URL | public token/password | Reports | immutable snapshot |
| `GET /api/pdf/:pdfId` | `GET /api/v1/reports/pdfs/:pdfId` | old alias | owner/ADMIN/share | Reports | object bytes server-streamed |
| `GET /api/schedules` | `GET /api/v1/monitoring/schedules` | old alias | USER | Monitoring | converge with watchdog scheduling |
| `POST /api/schedules` | `POST /api/v1/monitoring/schedules` | old alias | USER | Monitoring | URL SSRF validation |
| `PATCH /api/schedules/:id` | `PATCH /api/v1/monitoring/schedules/:id` | old alias | owner/ADMIN | Monitoring | state policy |
| `DELETE /api/schedules/:id` | `DELETE /api/v1/monitoring/schedules/:id` | old alias | owner/ADMIN | Monitoring | state policy |
| `POST /api/watchdog/subscribe` | `POST /api/v1/monitoring/targets` | old alias | USER | Monitoring | canonical watchdog create |
| `GET /api/watchdog/list` | `GET /api/v1/monitoring/targets` | old alias | USER/ADMIN | Monitoring | scoped list |
| `GET /api/watchdog/targets` | `GET /api/v1/monitoring/targets` | old alias | USER/ADMIN | Monitoring | merge duplicate |
| `GET /api/watchdog/:id` | `GET /api/v1/monitoring/targets/:id` | old alias | owner/ADMIN | Monitoring | exact target URL |
| `DELETE /api/watchdog/:id` | `DELETE /api/v1/monitoring/targets/:id` | old alias | owner/ADMIN | Monitoring | cancel/delete policy |
| `POST /api/webhooks/register` | `POST /api/v1/developer/webhooks` | old alias | USER/DEVELOPER | Developer | one registration contract |
| `GET /api/webhooks/list` | `GET /api/v1/developer/webhooks` | old alias | USER/DEVELOPER | Developer | merge duplicate |
| `GET /api/webhooks` | `GET /api/v1/developer/webhooks` | old alias | USER/DEVELOPER | Developer | merge duplicate |
| `POST /api/webhooks` | `POST /api/v1/developer/webhooks` | old alias | USER/DEVELOPER | Developer | same policy |
| `DELETE /api/webhooks/:id` | `DELETE /api/v1/developer/webhooks/:id` | old alias | owner/ADMIN | Developer | secret never returned |
| `POST /api/webhooks/test` | `POST /api/v1/developer/webhooks/:id/test` | old alias | owner/ADMIN | Developer | safe outbound URL |
| `POST /api/v1/scans` | `POST /api/v1/audits` | preserve request alias | API key scope | Audit/Developer | developer adapter returns existing summary shape initially |
| `GET /api/v1/scans` | `GET /api/v1/audits` | preserve response adapter | API key scope | Audit/Developer | scope maps to actor |
| `GET /api/v1/scans/:id` | `GET /api/v1/audits/:id` | preserve alias | API key scope | Audit/Developer | ownership policy |
| `GET /api/v1/scans/:id/findings` | `GET /api/v1/audits/:id/findings` | preserve alias | API key scope | Audit | findings DTO |
| `POST /api/v1/watchdog` | `POST /api/v1/monitoring/targets` | preserve alias | API key scope | Monitoring/Developer | same target command |
| `GET /api/v1/watchdog/:id` | `GET /api/v1/monitoring/targets/:id` | preserve alias | API key scope | Monitoring | same policy |
| `POST /api/v1/reports/share` | `POST /api/v1/reports/shares` | preserve alias | API key scope | Reports | snapshot contract |
| `POST /api/monetization/order` | `POST /api/v1/billing/orders` | old alias | optional USER | Billing | server price only |
| `POST /api/monetization/verify-payment` | `POST /api/v1/billing/payments/verify` | old alias | optional USER | Billing | signature/provider confirmation |
| `GET /api/monetization/orders` | `GET /api/v1/billing/orders` | old alias | USER/ADMIN | Billing | scoped orders |
| `POST /api/payments/webhook` | `POST /api/v1/billing/webhooks/razorpay` | preserve provider URL | provider signature | Billing | raw body + event idempotency |
| `GET /api/entitlements` | `GET /api/v1/billing/entitlements` | old alias | optional USER | Billing | plan/usage projection |
| `POST /api/auth/register` | `POST /api/v1/auth/register` | preserve current path alias | public | Identity | JWT pair |
| `POST /api/auth/login` | `POST /api/v1/auth/login` | preserve alias | public | Identity | access + refresh |
| `POST /api/auth/refresh` | `POST /api/v1/auth/refresh` | preserve alias | refresh token | Identity | rotation/reuse detection |
| `POST /api/auth/logout` | `POST /api/v1/auth/logout` | preserve alias | refresh token | Identity | revoke session |
| `POST /api/auth/logout-all` | `POST /api/v1/auth/logout-all` | preserve alias | USER | Identity | revoke family/user sessions |
| `GET /api/auth/me` | `GET /api/v1/auth/me` | preserve alias | USER | Identity | canonical actor |
| `POST /api/keys/create` | `POST /api/v1/developer/keys` | old alias | USER/ADMIN | Developer | raw key once |
| `POST /api/keys/revoke` | `POST /api/v1/developer/keys/:id/revoke` | old alias | owner/ADMIN | Developer | durable revoke |
| `POST /api/queue/enqueue` | `POST /api/v1/jobs` | old/internal alias | USER/ADMIN | Platform | allowlisted job contracts only |
| `GET /api/queue/job/:id` | `GET /api/v1/jobs/:id` | old/internal alias | owner/ADMIN | Platform | scoped status |
| `GET /api/dashboard` | `GET /api/v1/intelligence/dashboard` | old alias | USER | Intelligence | derived dashboard |
| `POST /api/competitor-sabotage` | `POST /api/v1/intelligence/competitive` | old alias | USER/AGENCY | Intelligence | retain only if productized |
| `POST /api/scan-batch` | `POST /api/v1/agency/batches` | old alias | AGENCY/entitled USER | Agency/Audit | enqueue batch job |
| `POST /api/ai/pitch-generator` | `POST /api/v1/agency/pitches` | old alias | AGENCY | Agency | enqueue AI pitch |
| `GET /api/user/export-data` | `GET /api/v1/identity/export` | old alias | USER | Identity | GDPR export orchestration |
| `POST /api/user/delete-account` | `POST /api/v1/identity/delete` | old alias | USER | Identity | domain cascade policy |
| `GET /api/admin/overview` | `GET /api/v1/admin/overview` | old alias | ADMIN | Admin | read model, audited |
| `POST /api/feedback` | `POST /api/v1/feedback` | preserve alias | public/USER | Platform | marketing/support; sanitize |

## Compatibility Rule

Adapters map legacy request bodies and response shapes at the edge. Domain services receive only V6 commands. Deprecation telemetry records caller and endpoint; removal requires zero known clients, documentation update, contract tests, and explicit release approval.
