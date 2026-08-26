# LeadGuard OS V6 Project Audit

## Executive Summary

### Product
LeadGuard OS is a multifunctional website conversion and lead-leak audit product. The current codebase combines a public landing experience, a live website scanner, a four-pillar audit model (lead, ad, SEO, cyber), 24/7 watchdog monitoring, report generation, agency tooling, developer API, payments, and admin dashboards. The product positions itself as a revenue-recovery and funnel-health platform for SMBs and agencies.

### Current maturity
Current state: strong MVP/prototype hybrid with production-oriented ambition. It is not a clean, stable production platform yet. It has real product concepts, real scan logic, real payment plumbing, and real monitoring infrastructure, but it still mixes demo/local tooling, migration layers, and multiple auth/storage patterns. This looks closer to an MVP-plus-innovation platform than a mature production SaaS.

### Major strengths
- Real product differentiation: the scanner and findings are concretely domain-specific, not generic SEO tooling.
- Strong domain expertise: WhatsApp, call buttons, Meta Pixel, GA4, security, and revenue leak ideas are specific and relevant.
- Real scanner engine and scoring model already exist in code.
- Good backup patterns: Postgres migration, durable queue, watchdog scheduling, and JWT/refresh-token design show deliberate engineering effort.
- Some security controls are present: SSRF blocking, rate limiting, signature verification, and security headers.

### Major weaknesses
- Architecture is fragmented: React app, Express server, worker, Prisma, Firebase, local JSON storage, plus legacy fallback layers all coexist without a single clean boundary.
- Product breadth exceeds system cohesion; many domains are built in parallel but not domain-owned.
- The codebase contains migration-era overlap: legacy JWT, Firebase auth, Firestore references, local JSON storage, and Postgres can all appear in the same flow.
- Frontend is very large and feature-dense; many tabs and modals imply a single-screen app with unbounded scope.
- Core business logic is spread across UI components, server routes, repositories, and scanner modules.
- The repo does not yet have a single obvious canonical ownership model for the domain data.

### Biggest risks
- Storage and auth duality: local JSON/dev storage and Postgres production storage coexist in the same code paths.
- Mixed trust boundaries: Firebase tokens, app JWTs, API keys, and admin secrets are accepted in multiple places.
- Overlapping product/engineering domains: agency, monitoring, payments, scanner, reports, and AI all compete for the same app surface.
- Hidden technical debt from feature sprawl and migration code.
- Scanner execution and queue patterns are more sophisticated than usability or admin maturity, but not yet backed by a clean operational model.

### Biggest opportunities
- Move to a strict domain architecture with a clean API + worker split.
- Consolidate identity and entitlement models.
- Separate a single canonical audit engine from the product UI.
- Decide whether agency is a distinct product line or a subdomain of a main audit product.
- Reduce the product to the highest-value scan-to-conversion workflow: scan, diagnose, fix, monitor, report.

---

## Current Product Model

The actual user journey in the repo is:

1. Visitor reaches the app from the marketing landing page.
2. Visitor enters a website URL into the scanner input.
3. Frontend calls POST /api/scan.
4. Server validates and resolves the host safely.
5. The scanner performs static analysis and optional runtime browser checks.
6. Findings are translated into issues and score pillars.
7. Result shows a lead/ad/SEO/cyber score and business impact.
8. User can open fix center, public report, watchdog, or pay for a service.
9. Monitoring can subscribe a domain for scheduled/continuous checks.
10. Reports can be exported or shared publicly.
11. Agency and dev flows are layered on top of the same product while preserving product structure.

### Anonymous user flow
- Landing page and marketing UI.
- Demo scan via /api/demo-scan or preset data.
- Public audit shares via /api/report/:token and /api/scan/:id with optional auth.
- Basic scan can occur without authenticated identity.

### Authenticated user flow
- Login/register via authService and JWT refresh rotation.
- JWT access token plus refresh flow.
- Scan and dashboard endpoints require or optionally accept user identity.
- User sees personalized history and ownership restrictions.

### Agency flow
- Agency role exists in auth and database.
- Agency-related components exist in the UI: AgencyView, AgencyWorkspaceView, AgencyToolsHub, HunterMode, BatchProspectScanner, CompetitorRadars, white-label reporting, pitch generation.
- This is not yet a separate product domain in code; it is an extension of the main app surface.

### Developer flow
- Developer dashboard and API key management exist.
- v1 API router requires X-API-Key and exposes programmatic scan/watchdog/report endpoints.
- Webhooks and developer portal productization are present but not fully centralized.

### Admin flow
- Admin dashboard, role gating, and monitoring features are present.
- Admin role is recognized in auth service and middleware.

### Payment flow
- Pricing catalog is implemented in server/config/pricing.ts.
- PaymentService validates Razorpay signatures and computes server-side prices.
- OrderRepository stores orders and fulfillments.
- Frontend opens Razorpay checkout from a React utility hook.

### Monitoring flow
- Watchdog targets are created via the app or API.
- Scheduler enqueues due targets in a durable queue.
- Worker executes runtime checks and updates the target state.
- Alerts and logs are stored in PostgreSQL and the local cache for dev/test.

---

## Architectural Reality

### Runtime stack
- Frontend: React + Vite in src/
- API: Express in server.ts
- Worker: standalone background worker in worker.ts
- Persistence: Prisma/Postgres with multiple compatibility layers
- Legacy compatibility: Firebase client SDK, Firebase Admin, Firestore usage, local JSON storage adapter
- AI: Google GenAI SDK with fallback summary generation
- Payments: Razorpay integration and signature checking

### Architectural pattern today
The repository is neither cleanly layered nor fully microservice-oriented. It is a monorepo-like single application with multiple internal modules and a durable worker, but one set of code is still carrying historical baggage. It is effectively a monolith with ambitious subdomains, and the monolith is not yet strongly decomposed.

### Where the code is valuable
- Scanner engine is legitimate and product-shaped.
- Background worker architecture is a serious positive.
- Durable queue and scheduled watchdog design are meaningful improvements.
- Prisma schema suggests a mature direction compared to raw local JSON usage.

### Where the code is risky
- Frontend tabs and domain-specific modules are over-broad.
- Migration layers and legacy auth paths make security and maintenance harder.
- Multi-store integration without clear ownership creates chaos.

---

## Feature and Domain Reality

The codebase covers the following major domains:
- Audit / scanner engine
- Intelligence / scoring / business impact
- Monitoring / watchdog
- Reports / share links / export
- Agency / prospect / pitch / white-label
- Developer / API / webhooks
- Billing / orders / entitlements
- Admin / dashboards / observability
- Security / SSRF / headers / auth
- AI / diagnostic summaries / remediation

It is not unitary in purpose. It contains some excellent subproducts but not yet a single coherent product strategy.

---

## Quality Verdict

### Frontend score: 5/10
Strong in aesthetics and feature breadth, weak in architecture cohesion and modular ownership.

### Backend score: 6/10
Strong in subsystem coverage and real integrations, weaker in domain separation and consistency.

### Database score: 6/10
The Prisma schema is promising, but migration and legacy compatibility still create complexity.

### Security score: 6/10
Some good controls exist; the mixed auth and storage patterns reduce confidence.

### Product score: 6/10
Real value exists, but the product is too broad and not yet disciplined enough to be a clear SaaS core.

---

## Direct Answer: What should V6 be?
V6 should be a simpler, product-owned architecture built around five domains: Identity, Audit, Monitoring, Reports, and Billing. Agency, Developer, and Admin should be treated as explicit, separate product surfaces rather than loaded directly into the main UX shell. The app should be split into web, API, worker, and shared packages, with Postgres as the single data authority and one dominant auth model.

---

## Final assessment
LeadGuard OS is not a dead project. It contains a meaningful, differentiated product engine and a serious attempt to build a next-generation revenue-recovery platform. But it is at the point where the architecture should be disciplined before more product scope is added. The correct V6 move is not to build more features in the current shape; it is to narrow scope, own domains, and separate the system into clear responsibilities.
