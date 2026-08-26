# LeadGuard OS V6 Frontend Architecture

## Target Boundary

`apps/web` is a React/Vite application that renders route-level experiences and calls the API through typed clients. It owns presentation state, URL navigation, optimistic UI where safe, and localization/theme presentation. It does not decide identity authority, ownership, entitlements, prices, scores, or report privacy.

```text
apps/web/src/
  app/                 providers, app bootstrap, error boundary
  routes/              route table, public/share compatibility resolution
  layouts/             public, authenticated, agency, admin, developer layouts
  pages/               route-level composition only
  domains/
    audit/             audit page views, finding presentation, fix center
    intelligence/      executive, funnel, revenue, competitive views
    monitoring/        watchdog, schedules, incidents, alerts
    reports/           report list, report detail, public report
    agency/            clients, prospects, pitch, white-label
    billing/           pricing, checkout, orders, entitlements display
    developer/         API keys, webhooks, OpenAPI docs
    admin/             operational console
  components/
    ui/                buttons, inputs, dialogs, status primitives
    layout/            navigation, sidebars, shells
    feedback/          loading, error, empty, toast states
    data-display/      tables, score cards, timelines
  api/                 client, auth, audit, intelligence, monitoring, reports, billing, agency, developer, admin
  state/               query/cache state and route-local stores
  hooks/               reusable view hooks
  contexts/            session, locale, theme only
  utils/               formatting and browser-safe helpers
  styles/              global tokens and CSS
```

## Current-to-Target Component Matrix

| Current file/component family | Target location | Reason | Dependencies |
|---|---|---|---|
| `src/App.tsx` | `apps/web/src/app/AppShell.tsx` plus `routes/` | remove giant orchestration; route state becomes explicit | route table, session provider, layouts |
| `src/components/MarketingHome.tsx` | `domains/marketing/pages/MarketingHome.tsx` or `pages/MarketingPage.tsx` | public marketing is outside authenticated core | audit API for CTA only, content config |
| `HeroScanner.tsx` | `domains/audit/components/AuditLauncher.tsx` | audit entry owns scan command | `api/audit.ts`, audit state |
| `AuditCommandCenter.tsx` | `domains/audit/pages/AuditDetailPage.tsx` | route-level audit composition | audit query, finding components |
| `FindingsDetailTabs.tsx` | `domains/audit/components/FindingsTabs.tsx` | findings are audit presentation | audit contract |
| `FourPillarsOverview.tsx`, `ScoreDashboard.tsx` | `domains/audit/components/ScoreSummary.tsx` | score display only; calculation stays API | audit result DTO |
| `FixCenter*`, `RevenueScenarioCalculator`, `FunnelLeakSimulator`, `MobileLinkSimulator` | `domains/audit/components/` and `domains/intelligence/components/` | distinguish remediation UI from derived simulation | audit/intelligence contracts; local state only where explicitly non-durable |
| `IntelligenceView.tsx`, `ExecutiveDashboardView.tsx` | `domains/intelligence/pages/` | intelligence route ownership | `api/intelligence.ts` |
| `MonitoringView.tsx`, `WatchdogModal.tsx`, `SchedulesView.tsx` | `domains/monitoring/` | watchdog and schedule concepts become one monitoring domain | `api/monitoring.ts` |
| `ReportsView.tsx`, `PublicReportView.tsx`, `ShareableReportModal.tsx` | `domains/reports/` | report privacy and rendering are centralized | `api/reports.ts` |
| `AgencyView.tsx`, `AgencyWorkspaceView.tsx`, `AgencyToolsHub.tsx`, `HunterMode.tsx`, `BatchProspectScanner.tsx` | `domains/agency/` | agency no longer pollutes the core audit shell | `api/agency.ts`, audit/intelligence contracts |
| `PricingView.tsx`, `BillingView.tsx`, `ExpressFixModal.tsx`, `MonetizationVault` | `domains/billing/` | checkout is a billing surface, not scanner state | `api/billing.ts` |
| `DeveloperDashboardView.tsx`, `WebhooksManager` | `domains/developer/` | service-account/API-key UX is isolated | `api/developer.ts` |
| `AdminDashboardView.tsx` | `domains/admin/` | explicit admin layout and policy | `api/admin.ts` |
| `AuthModal.tsx`, auth context/hooks | `app/providers/session` and `domains/identity/` | one session contract | `api/auth.ts` |
| `Navbar.tsx`, `Footer.tsx`, `EmptyState.tsx` | `components/layout`, `components/feedback` | shared presentation primitives | no domain repositories |
| `Testimonials*`, `BlogHubView.tsx`, `AboutLeadGuardModal.tsx`, `ServicesCatalogModal.tsx` | `pages/marketing` and `domains/marketing/` | support/marketing scope separate from product core | static content, feedback API if later added |
| `LanguageContext`, theme CSS/config | `contexts/locale`, `contexts/theme`, `styles/` | presentation-only cross-cutting state | browser storage, config |
| `src/lib/api.ts` | `api/client.ts` | single typed transport boundary | fetch, token provider, request IDs |
| `src/types.ts` | split into `packages/types` and domain-local view models | remove duplicated server/client shapes | generated/shared contracts |

## Route and State Rules

- Route loaders/query hooks fetch server state; components do not call `fetch` directly.
- Session context stores access-token state and current user presentation only. It never grants authority.
- Cache keys include authenticated subject and resource ID. Mutations invalidate domain queries.
- Public report pages use a separate unauthenticated query path and a sanitized DTO.
- Modal state is local to the owning route or URL query; global state is limited to session, locale, theme, and request notifications.
- Loading, empty, forbidden, expired-share, and provider-failure states are first-class UI states.

## API Client Modules

`api/client.ts` handles base URL, JSON parsing, request ID, timeout, token injection, one refresh attempt on 401, and normalized errors. Domain modules expose typed functions only: `auth.ts`, `audit.ts`, `intelligence.ts`, `monitoring.ts`, `reports.ts`, `billing.ts`, `agency.ts`, `developer.ts`, and `admin.ts`. No module accepts client-supplied price, role, score, or ownership as authoritative data.
