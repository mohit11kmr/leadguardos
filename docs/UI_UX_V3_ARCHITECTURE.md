# LeadGuard OS V3 — Full Platform Professional SaaS UI/UX Architecture

**Version:** 3.0.0-PRO  
**Principle:** **DO NOT REDUCE FEATURES. REDUCE COGNITIVE COMPLEXITY.**  
**Core Promise:** A Website Lead Protection & Revenue Intelligence Platform that is simple at the surface for first-time visitors and deeply powerful underneath for marketers, agencies, and enterprise developers.

---

## 1. Product Hierarchy & Levels

```text
Level 1: Quick Audit (First-time business owner)
         ↓
Level 2: Revenue Intelligence (Growth Marketers & SMBs)
         ↓
Level 3: 24/7 Channel Protection (Active website monitoring)
         ↓
Level 4: Agency Growth Suite (Agencies managing client portfolios)
         ↓
Level 5: Developer & Enterprise (APIs, Webhooks, Admin controls)
```

---

## 2. Global Navigation System

### Desktop Top Navigation Bar
```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ LeadGuard OS   [ Audit ] [ Intelligence ] [ Monitoring ] [ Reports ] [ Agency ]  More ▾  [ Pricing ]   Help  Account │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Primary Tabs:
1. **`Audit` (`audit`):** The Command Center. Before scan: Clean, high-converting hero with 30s audit reassurance and 6 capability cards. After scan: Full SaaS Audit Command Center with sub-navigation tabs (Overview, Lead Capture, Advertising, SEO, Security, Mobile Simulator, Funnel, Revenue Scenario, AI Fixes, Fix Center, Verification Matrix).
2. **`Intelligence` (`intelligence`):** Dedicated Revenue Intelligence Workspace with sub-tabs:
   - Executive Dashboard (`ExecutiveDashboardView`)
   - Funnel Leak Simulator (`FunnelLeakSimulator`)
   - Revenue Scenario Calculator (`RevenueScenarioCalculator`)
   - Zero-Intent WhatsApp Checker (`ZeroIntentChecker`)
   - E-Commerce Cart Death Monitor (`CartDeathMonitor`)
   - Competitor Sabotage Radar (`CompetitorSabotageRadar`)
3. **`Monitoring` (`monitoring`):** Continuous 24/7 Lead Protection Workspace with sub-tabs:
   - Active Watchdog Radar (`WatchdogConsole`)
   - Automated Schedules (`SchedulesView`)
   - Webhook Dispatcher & HMAC Integrations (`WebhooksManager`)
4. **`Reports` (`reports`):** Comprehensive Reports Hub (`ReportsView`):
   - Previous Scans History & searchable table
   - White-Label PDF Downloads
   - Cryptographic Share Links (`/report/:token`)
   - Scan Comparison Engine
5. **`Agency` (`agency`):** Full B2B Agency Suite (`AgencyView`):
   - Client Workspace & Portfolio Manager (`AgencyWorkspaceView`)
   - Batch Prospect Lead Hunter (`BatchProspectScanner` / `HunterMode`)
   - Hinglish / English AI Cold Pitch Generator (`AgencyPitchSuite`)
   - Competitor Gap Spy (`CompetitorSpy`)
   - Diagnostic Studio (`LinkDebuggerSandbox`, `AutoFixScriptStudio`, `WidgetGenerator`)
6. **`More ▾` (Structured Dropdown Menu):**
   - **Diagnostic Tools:** Mobile Link Simulator, Funnel Simulator, Cart Death, Zero-Intent, Competitor Spy
   - **Automation:** 24/7 Watchdog, Automated Schedules, Instant WhatsApp Alerts
   - **Developer:** REST API Keys, Webhooks Manager, OpenAPI Specification
   - **Resources:** Knowledge Hub & Articles, Client Reviews, Story & Services Catalog
7. **`Pricing` (`pricing`):** Outcome-based enterprise SaaS pricing (Free Audit, Express Fix ₹2,999, Watchdog ₹299/mo, Agency Pro ₹4,999/mo).

#### Header Right Utilities:
- **`Help ▾`:** Direct Founder Support (+91 83070 70605), Client Testimonials, About LeadGuard, Services Catalog.
- **`Account ▾`:** Auth (Sign In / Register), Account Settings, Billing & Invoices, Developer Portal, Admin Dashboard (Role-gated), Language Switcher, Theme Switcher.

---

## 3. The Audit Command Center (Post-Scan Sub-Navigation)

When an audit is complete, the user enters a rich, multi-dimensional Command Center:

```text
AUDIT COMMAND CENTER: drsharmadental.in
[ Overview ] [ Lead Capture ] [ Advertising ] [ SEO ] [ Security ] [ Mobile ] [ Funnel ] [ AI Fixes ] [ Fix Center ]
```

1. **Overview:** Lead Health Score (62/100), Estimated Monthly Rupee Loss (₹42,500/mo), Leads at Risk (~24/mo), 4-Pillar visual scorecards, Critical Lead Losses alert cards.
2. **Lead Capture:** Deep inspection of WhatsApp +9191 links, phone click-to-call links, forms, email mailto:, Google Reviews.
3. **Advertising:** Meta Pixel (`fbq`), Google Analytics 4 (`G-XXXXX`), GTM tags, conversion event dropoffs.
4. **SEO & Indexing:** Google robots `noindex` warnings, canonical conflicts, OpenGraph social previews, sitemap health.
5. **Security:** SSL certificates, mixed content HTTP resources, Content Security Policy, security headers.
6. **Mobile Experience:** Interactive real-device link simulator for iOS, Android, and Desktop WhatsApp Web.
7. **Funnel & Revenue:** Funnel Leak Simulator and interactive Financial Scenario Calculator with customizable traffic/order value sliders.
8. **AI Fixes:** Structured AI remediation with syntax-highlighted code patches and 1-click copy.
9. **Fix Center:** Severity-filtered issue cards with business rationale, technical evidence accordions, and self-service or DFY 48h resolution CTAs.

---

## 4. Mobile & Responsive Layout Architecture

- **Mobile Header:** Brand identity + Hamburger menu + quick Scan CTA.
- **Mobile Drawer:** Clean grid navigation linking to all 5 primary workspaces plus structured sub-tools.
- **Horizontal Scrollable Sub-tabs:** Workspace sub-navigations gracefully scroll horizontally on mobile devices.
- **Card-first Data Presentation:** Tables gracefully collapse into touch-friendly stacked cards on screens < 768px.

---

## 5. Design Language & Semantic Token System

- **Primary / Brand:** Deep Rose / Crimson (`#E11D48` / `#BE123C`)
- **Healthy / Verified:** Emerald Green (`#10B981` / `#059669`)
- **Warning / Attention:** Warm Amber (`#F59E0B` / `#D97706`)
- **Critical / Action Required:** High-Contrast Red (`#EF4444` / `#DC2626`)
- **Information / Metrics:** Sky Blue (`#0284C7`)
- **Surfaces:** Dark Slate (`#020617` / `#0F172A`) with subtle glassmorphic borders (`border-slate-800/80`)
