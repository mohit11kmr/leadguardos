# LeadGuard OS V6 File Migration Matrix

Paths are target destinations for Phase 3 planning only. No file movement occurs in Phase 2.

| Current path/directory | Target path | Boundary | Action | Dependency risk | Phase |
|---|---|---|---|---|---|
| `src/App.tsx` | `apps/web/src/app/AppShell.tsx` + `routes/` | Web | split orchestration | high: all components/state | 3A |
| `src/main.tsx` | `apps/web/src/main.tsx` | Web | move unchanged bootstrap | low | 3A |
| `src/types.ts` | `packages/types/audit.ts`, domain UI types | Shared/Web | split by contract | high shape compatibility | 3A |
| `src/components/Navbar.tsx`, `Footer.tsx` | `apps/web/src/components/layout/` | Web | move | medium | 3A |
| `src/components/common/*` | `apps/web/src/components/` | Web | classify UI/feedback/data | medium | 3A |
| `src/components/{HeroScanner,AuditCommandCenter,FindingsDetailTabs,FourPillarsOverview,ScoreDashboard}*` | `apps/web/src/domains/audit/` | Web | move and route-compose | high API state | 3A |
| `src/components/{IntelligenceView,ExecutiveDashboardView}*` | `apps/web/src/domains/intelligence/` | Web | move | medium | 3B |
| `src/components/{MonitoringView,WatchdogModal,SchedulesView}*` | `apps/web/src/domains/monitoring/` | Web | move | high polling/API coupling | 3D |
| `src/components/{ReportsView,PublicReportView,ShareableReportModal}*` | `apps/web/src/domains/reports/` | Web | move | high public URL compatibility | 3E |
| `src/components/{AgencyView,AgencyWorkspaceView,AgencyToolsHub,HunterMode,BatchProspectScanner}*` | `apps/web/src/domains/agency/` | Web | move behind org routes | high mixed mock/API state | 3F |
| `src/components/{PricingView,BillingView,ExpressFixModal,MonetizationVault}*` | `apps/web/src/domains/billing/` | Web | move | high payment callbacks | 3G |
| `src/components/{DeveloperDashboardView,WebhooksManager}*` | `apps/web/src/domains/developer/` | Web | move | medium key/webhook policy | 3D |
| `src/components/AdminDashboardView.tsx` | `apps/web/src/domains/admin/` | Web | move behind admin layout | high privilege routing | 3G |
| `src/components/{AuthModal,ReviewSubmissionModal,WhatsAppAlertModal}*` | identity/marketing-owned web domains | Web | classify; replace fake persistence where needed | medium | 3A/3B |
| `src/context/*` | `apps/web/src/contexts/` | Web | retain only session/locale/theme | medium global state | 3A |
| `src/lib/api.ts` | `apps/web/src/api/client.ts` | Web | replace direct fetch boundary | high all consumers | 3A |
| `src/config/*` | `packages/config` or web config | Shared/Web | split browser-safe values | medium secret leakage risk | 3A |
| `src/services/*`, `src/utils/*` | web domain utilities or packages/types | Web/Shared | classify, no server imports | medium | 3A |
| `server.ts` | `apps/api/src/server.ts` + `app.ts` + routes | API | decompose, preserve aliases | critical route/startup coupling | 3A-3G |
| `server/api/v1.ts` | `apps/api/src/domains/{audit,monitoring,reports,developer}/routes.ts` | API | split canonical routes | high duplicate API behavior | 3B-3G |
| `server/api/openapi.ts` | `apps/api/src/domains/developer/openapi.ts` | API | generate from contracts | medium drift | 3D |
| `server/auth/*`, `server/middleware/auth.ts` | `apps/api/src/domains/identity/` + middleware | API | canonicalize actor context | critical mixed auth | 3H |
| `server/config/env.ts`, `envValidator.ts` | `apps/api/src/config/` + `packages/config` | API/Shared | one manifest/validator | high startup semantics | 3A |
| `server/config/pricing.ts` | `apps/api/src/domains/billing/catalog.ts` | API | move server catalog | high client price assumptions | 3G |
| `server/scannerEngine.ts`, `server/scanner/**` | `apps/api/src/domains/audit/engine/` | API domain | isolate orchestrator/detectors | critical scanner behavior | 3B |
| `server/ssrfGuard.ts`, `server/security/safeFetch.ts` | `packages/security/ssrf` + API adapter | Shared/API | preserve and test | critical outbound safety | 3B |
| `server/security/{securityHeaders,rateLimiter,apiKeyManager,firebaseAuth}.ts` | packages/security plus identity/developer infrastructure | Shared/API | split by ownership | critical trust model | 3H |
| `server/repositories/*` | each domain `infrastructure/repositories/` | API | move behind interfaces | critical DB ownership | 3C-3G |
| `server/db/*`, `prisma/*` | `apps/api/src/infrastructure/database`, root `prisma/` | API/Root | retain schema root; adapter move | critical migration compatibility | 3C |
| `server/storage.ts`, `data/leadguard-db.json` | `infrastructure/legacy-storage` migration adapter | API migration | read-only then retire | critical mixed persistence | 3C |
| `server/reports/*` | `apps/api/src/domains/reports/` | API | move report policy/mapper | high public access | 3E |
| `server/services/payment*.ts`, entitlement | `apps/api/src/domains/billing/` | API | move state machine/catalog | critical payment integrity | 3G |
| `server/services/ai.service.ts` | `apps/worker/src/jobs/ai/` + audit contract | Worker/Audit | provider execution worker | high evidence safety | 3D |
| `server/watchdogScheduler.ts` | `apps/worker/src/jobs/monitoring/` | Worker | scheduler ownership | high duplicate scheduling | 3D |
| `server/queue/*` | `apps/worker/src/queue`, `jobs`, `retry` | Worker | move queue/executors | critical job compatibility | 3D |
| `worker.ts` | `apps/worker/src/worker.ts` | Worker | slim bootstrap | medium | 3D |
| `scripts/*` | root `scripts/` | Root | retain and classify migrations | low | 3C |
| `Dockerfile`, `vite.config.ts`, `tsconfig.json` | root plus app-specific configs | Root/Apps | split build targets | medium deployment coupling | 3A |
| `docs/*` | root `docs/` | Docs | preserve, add Phase 2 blueprint | none | 2 |
