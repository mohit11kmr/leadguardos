# V6 API Registry

This registry captures the API surface found in the codebase. It reflects actual route definitions in the Express server and the V1 developer API router.

| Method | Path | Auth | Role | Purpose | Request | Response | Service | DB | Frontend Consumers | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | /api/health | none | public | health and readiness | none | status, timestamp, version, aiReady, monitorsCount | server.ts | storage/watchdog | app startup, monitors | Active |
| GET | /api/features | none | public | expose feature registry | none | feature list and counts | FEATURE_REGISTRY | none | not directly used in main UI | Active |
| GET | /api/config | none | public | app config | none | APP_CONFIG | app config | none | frontend config | Active |
| GET | /api/scan-stats | none | public | read aggregate scan stats | none | storage stats | storage | local JSON / Postgres stats | app stats widget | Active |
| GET | /api/schedules | Bearer JWT | USER | list user schedules | none | schedules array | storage | local JSON / legacy | UI schedules panel | Partial |
| POST | /api/schedules | Bearer JWT | USER | create recurring scan schedule | targetUrl, frequency | schedule object | storage + validateAndResolveSafeUrl | local JSON / legacy | schedules flow | Partial |
| PATCH | /api/schedules/:id | Bearer JWT | USER | update schedule | enabled/frequency | updated schedule | storage | local JSON / legacy | schedules flow | Partial |
| DELETE | /api/schedules/:id | Bearer JWT | USER | delete schedule | none | success boolean | storage | local JSON / legacy | schedules flow | Partial |
| GET | /api/dashboard | Bearer JWT | USER | get user dashboard stats | none | scans, vulnerabilities, severity, risky URLs | storage | local JSON | front-end dashboard | Active |
| POST | /api/scan-stats/increment-fix | Bearer JWT | USER | increment fix count | none | updated stats | storage | local JSON | UI counters | Active |
| GET | /api/scans/history | optional | public/user | list recent scan history | none | history list | storage | local JSON | home page + audit history | Active |
| POST | /api/demo-scan | none | public | return demo audit preset | presetId | audit result | scannerEngine | none | landing/demo experiences | Active |
| POST | /api/scan | optional JWT | user/public | execute live website scan | url | full audit result | executeLiveWebsiteScan | Scan repository + DB | HeroScanner, AuditCommandCenter | Core |
| GET | /api/report/:token | none | public | get public report by token | token in path | public report | reportRepository | ReportShare | PublicReportView | Active |
| GET | /api/scan/:id | optional JWT | public/user/admin | get private or public scan report | scan id | report object | storage | local JSON + scan repo | report route | Active |
| GET | /api/scan/:id/export | optional JWT | public/user/admin | export scan JSON | scan id | JSON attachment | storage | local JSON + DB | export flows | Active |
| POST | /api/watchdog/subscribe | Bearer JWT | USER | register watchdog target | targetUrl, contact, channel, frequency | monitor object | watchdogRepository | Watchdog table | monitoring UI | Active |
| GET | /api/watchdog/targets | Bearer JWT | USER/ADMIN | list watchdog targets | none | targets | watchdogRepository | Watchdog | MonitoringView | likely exists in app |
| DELETE | /api/watchdog/:id | Bearer JWT | USER/ADMIN | delete watchdog | none | success state | watchdogRepository | Watchdog | monitoring UI | likely exists |
| POST | /api/webhooks/subscribe | Bearer JWT | USER | register webhook endpoint | url, secret, events | webhook config | webhookRepository | Webhook | Developer dashboard | Active |
| GET | /api/webhooks | Bearer JWT | USER | list webhooks | none | webhooks | webhookRepository | Webhook | Developer dashboard | Active |
| POST | /api/monetization/order | likely exists | user | create payment order | tierId | order metadata | payment flow | Order | pricing UI | likely present |
| POST | /api/monetization/webhook | none | verification only | handle Razorpay callback | signed request | ack | payment verification | PaymentEvent | checkout flow | Active |
| POST | /api/auth/register | none | public | register user | email/password | token pair | authService | User | AuthModal | Active |
| POST | /api/auth/login | none | public | login user | email/password | token pair | authService | User | AuthModal | Active |
| POST | /api/auth/refresh | none | public | refresh access token | refresh token | new token pair | authService | RefreshToken | client auth | Active |
| POST | /api/auth/logout | Bearer JWT | USER | logout session | none | void | authService | RefreshToken | client auth | Active |
| GET | /api/v1/scans | X-API-Key | DEVELOPER | list scans for API key owner | none | scans list | scanRepository | Scan | external dev integrations | Active |
| POST | /api/v1/scans | X-API-Key | DEVELOPER | create scan via API key | url + options | scan summary | executeLiveWebsiteScan + scanRepository | Scan | external dev integrations | Active |
| GET | /api/v1/scans/:id | X-API-Key | DEVELOPER | fetch scan details | scan id | scan payload | scanRepository | Scan | external apps | Active |
| GET | /api/v1/scans/:id/findings | X-API-Key | DEVELOPER | fetch issue list | scan id | findings | scanRepository | Scan | external apps | Active |
| POST | /api/v1/watchdog | X-API-Key | DEVELOPER | create watchdog target | url, contact, channel, frequency | target | watchdogRepository | Watchdog | external apps | Active |
| GET | /api/v1/watchdog/:id | X-API-Key | DEVELOPER | fetch watchdog | id | target payload | watchdogRepository | Watchdog | external apps | Active |
| POST | /api/v1/reports/share | X-API-Key | DEVELOPER | share report | scanId, password | shareUrl + token | reportManager | ReportShare | external apps | Active |

## Observations

### Duplicated APIs
- /api/schedules and /api/watchdog/subscribe are both recurring monitoring concepts but are not unified under a common pattern.
- /api/scan and /api/v1/scans both provide scan creation but with different auth models and payloads.
- Public report is exposed via /api/report/:token and /api/scan/:id with different privacy semantics.

### Inconsistent response formats
- Some routes return { error: { code, message, requestId } } while others return { error: { code, message } }.
- Some API responses are full audit result objects while others are summary-shaped API responses.
- Some endpoints use user-scoped response shaping, others use public-shared shaping depending on auth.

### Inconsistent naming
- monitor implies both Watchdog and recurring schedule concepts.
- /api/watchdog/subscribe and /api/v1/watchdog are conceptually similar but are not unified.
- Some revenue/monetization endpoints are described in comments but not all are clearly surfaced in the main server file.

### Potentially obsolete endpoints
- Legacy /api/demo-scan is a demo path that sits near production endpoints; its existence can confuse route ownership.
- Local JSON /api/scan-stats and schedule APIs are legacy dev-style APIs that may not belong in the same contract as the Postgres-backed API.
- Unclear server routes for monetization and admin are not always visible in a centralized API inventory.

### Endpoints used by frontend
- /api/scan
- /api/scans/history
- /api/dashboard
- /api/watchdog/subscribe
- /api/report/:token
- /api/demo-scan
- /api/config
- /api/features

### Endpoints unused by frontend
- Some V1 API routes appear to be developer-only and may not be used by the app itself.
- Not all admin or webhook routes are clearly consumed by the current UI.

### Recommended V6 API design
- One canonical API surface with namespaced versions: /v1 or /api/domain
- Reduce route duplication between public app API and developer API
- Align all error envelopes to a single format
- Enforce a single auth model and one user context object
