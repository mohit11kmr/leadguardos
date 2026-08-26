# LeadGuard OS — UI/UX & Information Architecture Blueprint

**Version:** 2.0.0-RC  
**Role:** Principal Product Designer & Frontend Architect  
**Objective:** Transform LeadGuard OS into a coherent, outcome-first conversion & lead-protection platform for business owners and agencies.

---

## 1. Product Positioning & Core Promise

### Core Definition
> **LeadGuard OS is a website lead-leakage and conversion protection platform.**

### Core Value Proposition
> **"Find and fix the hidden technical problems that make your business lose customer leads and waste ad budget."**

### Transformation from Technical to Business-First Terminology

| Technical / Internal Term | Business Outcome Terminology (User-Facing) |
|---|---|
| "Meta Pixel (`fbq`) / GA4 Missing" | **"Unreliable Ad Tracking & Conversion Attribution"** — Ad spend may be generating clicks without feeding conversion data back to Meta/Google. |
| "WhatsApp +9191 Regex Error" | **"Broken WhatsApp Lead Routing"** — Customers click to chat but encounter "Invalid Number" error. |
| "`tel:` Link Protocol Absent" | **"Unclickable Phone Call Button"** — Mobile visitors cannot tap to dial your sales number directly. |
| "Robots `noindex` / Canonical Mismatch" | **"Search Visibility & Indexing Risk"** — Google search crawlers are restricted from indexing your landing page. |
| "CSP Permissive / SSL Mixed Content" | **"Security & Customer Trust Vulnerability"** — Visitors may see security warnings or insecure resource flags. |

---

## 2. Target User Personas

1. **The Indian SMB & Business Owner (Primary User):**
   - *Needs:* Wants to know in 5 seconds if their WhatsApp buttons, phone numbers, and ads are working.
   - *Behavior:* Zero tolerance for developer jargon (SSRF, DOM mutation, regex). Needs clear rupee-denominated impact (₹) and a 1-click fix.
2. **The Growth Marketer / Performance Advertiser:**
   - *Needs:* Validates that Meta Pixel, GA4, and conversion events fire accurately so ad budget is not wasted.
3. **The Digital Marketing Agency / Freelancer:**
   - *Needs:* White-label client audit PDFs, batch prospect scanning (Hunter Mode), automated cold pitches, and client reporting.
4. **The Technical Developer / Sysadmin:**
   - *Needs:* Clean REST API keys, cryptographically signed webhooks, and OpenAPI specs (nested in Developer Portal).

---

## 3. Primary User Journey

```text
1. LANDING PAGE
   Is your website losing leads?
        ↓
2. ENTER WEBSITE URL
   Simple input: yourwebsite.com (30s audit • No code required)
        ↓
3. DIAGNOSTIC PROGRESSION
   Live trustworthy check stages (Availability → WhatsApp → Phone → Analytics → SEO → Security)
        ↓
4. AUDIT RESULT & LEAD HEALTH SCORE
   Overall Score (e.g. 62/100 • Needs Attention) + Rupee Loss at Risk (₹54,000/mo)
        ↓
5. FOUR-PILLAR HEALTH CARDS
   Lead Capture (48 ⚠) | Ad Tracking (72 ⚠) | SEO (91 ✓) | Security (84 ✓)
        ↓
6. CRITICAL ISSUES & IMPACT BREAKDOWN
   Highest-revenue problems surfaced first with exact affected pages
        ↓
7. FIX CENTER & RESOLUTION
   [Fix Now (Self-Service)] or [Get This Fixed (Express 48h DFY)]
        ↓
8. GENERATE & SHARE REPORT
   Download White-Label PDF or generate cryptographic Share Link
        ↓
9. ACTIVATE 24/7 WATCHDOG MONITORING
   Keep lead channels protected against regressions after updates
```

---

## 4. Simplified Information Architecture

### Primary Navigation (Desktop Header)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ LeadGuard OS       [ Audit ]  [ Reports ]  [ Monitoring ]  [ Agency ]  [ Pricing ]     Help  Account  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Audit (`audit` / default):** The single-purpose scanning landing page and active audit result dashboard.
- **Reports (`reports`):** Audit history, saved scans, scan comparison, PDF export, and public share links.
- **Monitoring (`monitoring`):** 24/7 Watchdog console, uptime/lead channel health, alert notification channels (WhatsApp/Telegram/Email).
- **Agency (`agency`):** Dedicated workspace for agencies — Client Manager, Batch Prospect Hunter, AI Pitch Generator, White-Label PDF settings.
- **Pricing (`pricing`):** Outcome-based transparent pricing (Free Audit, Express Fix ₹2,999, 24/7 Watchdog ₹299/mo, Agency License ₹4,999/mo).

### Header Right Utilities
- **Help (`help`):** Direct founder contact (+91 83070 70605), Client Reviews, Knowledge Hub.
- **Account (`account`):** Auth profile (Sign In / Register), Billing details, Developer Portal (API keys & webhooks), Language toggle (English / Hinglish), Theme toggle (Dark / Light / System).

### Advanced Feature Placement Map
- **Funnel Simulator & Revenue Scenario:** Integrated into Audit Result "Financial Impact" drawer.
- **Zero-Intent & Cart Death:** Categorized under Agency / Specialized Audits tab.
- **Competitor Sabotage Radar:** Grouped inside Agency Tools.
- **Developer Portal (API Keys & Webhooks):** Accessible via Account menu → Developer Portal.
- **Admin Dashboard:** Role-gated inside Account menu for authorized admins.

---

## 5. Screen Hierarchy & Wireframe Specifications

### Screen 1: Audit / Home (Zero-Friction Entry)
```text
┌────────────────────────────────────────────────────────────────────────┐
│                              ⚡ LeadGuard OS                           │
│                     Is Your Website Losing Leads?                      │
│   LeadGuard finds broken WhatsApp, phone, forms, tracking, SEO and     │
│   security problems that can cost you customers and ad money.          │
│                                                                        │
│   ┌──────────────────────────────────────────────┬──────────────────┐  │
│   │ 🌐 yourwebsite.com                           │  Scan My Website │  │
│   └──────────────────────────────────────────────┴──────────────────┘  │
│                   ⏱️ 30-second audit • No code required                │
│                                                                        │
│   Sample Audits: [ Dental Clinic ] [ Real Estate ] [ D2C Store ]      │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📱 Lead Capture │  │ 🎯 Ad Tracking  │  │ 🔍 SEO Health   │  │ 🛡️ Security     │
│ Broken WhatsApp,│  │ Missing or      │  │ Prevent search  │  │ Detect website  │
│ phone & forms   │  │ broken pixels   │  │ indexing drops  │  │ vulnerabilities │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Screen 2: Diagnostic Scan State
```text
┌────────────────────────────────────────────────────────────────────────┐
│  Scanning drsharmadental.in...                                  65%    │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                        │
│  ✓ Checking website availability & SSL handshake                       │
│  ✓ Inspecting WhatsApp links for +9191 routing errors                  │
│  ● Verifying click-to-call phone buttons...                            │
│  ○ Checking Meta Pixel & Google Analytics 4 tags                       │
│  ○ Checking SEO indexing & canonical directives                        │
│  ○ Inspecting security headers & Content Security Policy               │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 3: Audit Result View
```text
┌────────────────────────────────────────────────────────────────────────┐
│  Audit Result for drsharmadental.in                  [ PDF ] [ Share ] │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │    Lead Health Score    │  │       Estimated Monthly Loss        │  │
│  │         62 / 100        │  │         ₹42,500 / month             │  │
│  │     Needs Attention     │  │   24 Leads at Risk • 3 Critical     │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                        │
│  FOUR PILLARS BREAKDOWN:                                               │
│  [ Lead Capture: 48 ⚠ ] [ Ad Tracking: 70 ⚠ ] [ SEO: 95 ✓ ] [ Security: 85 ✓ ]
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 4: Unified Fix Center
```text
┌────────────────────────────────────────────────────────────────────────┐
│  Fix Center                                                            │
│  Tabs: [ All (7) ] [ Critical (3) ] [ High (2) ] [ Medium (2) ]        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL: WhatsApp button uses invalid double '+9191' prefix  │  │
│  │ Why it matters: Mobile visitors tap WhatsApp and get an error.   │  │
│  │ Detected: wa.me/91918307070605 on Home & Contact pages           │  │
│  │ Recommended Fix: Change href to 'https://wa.me/918307070605'     │  │
│  │                                 [ Show Evidence ] [ Fix Now ]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL: Meta Pixel tracking code is absent                  │  │
│  │ Why it matters: Meta cannot optimize ad campaigns for leads.     │  │
│  │ Recommended Fix: Install standard fbq('init') snippet in <head>   │  │
│  │                                 [ Show Evidence ] [ Fix Now ]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Design System & Component Guidelines

### Color System (Calm & Semantic)
- **Primary / Brand:** Rose (`#E11D48` / `#BE123C`) — Used for primary CTAs and brand identity.
- **Success / Healthy:** Emerald (`#10B981` / `#059669`) — Score >= 80, verified channels.
- **Warning / Moderate:** Amber (`#F59E0B` / `#D97706`) — Score 50–79, optimization opportunities.
- **Critical / Danger:** Rose/Red (`#EF4444` / `#DC2626`) — Score < 50, broken lead channels.
- **Informational / Analytics:** Sky/Blue (`#0284C7`) — Technical indicators, metrics.
- **Surface / Background:** Slate (`#020617` Dark / `#F8FAFC` Light) — Clean readable cards with minimal noise.

### Typography
- **Headings:** Plus Jakarta Sans / Outfit — bold, human, authoritative.
- **Body & Data:** Inter / System UI — high legibility.
- **Code & Values:** JetBrains Mono — precise numbers and URL proofs.

---

## 7. Execution Checklist & Phase Plan

- [x] **Phase 0:** Architecture Blueprint documented in `docs/UI_UX_ARCHITECTURE.md`.
- [ ] **Phase 1:** Refactor Navigation and Top-level state architecture into clean 5-tab model.
- [ ] **Phase 2:** Redesign Hero Landing & Scanner with 4 business outcome cards and clear copy.
- [ ] **Phase 3:** Redesign Scan Progress view with stage-by-stage diagnostics.
- [ ] **Phase 4:** Redesign Audit Result Page (Lead Health Score + Estimated Rupee Loss + 4 Pillars).
- [ ] **Phase 5:** Build unified Fix Center with progressive technical disclosure.
- [ ] **Phase 6:** Integrate dedicated Reports Hub (history, compare, download, share).
- [ ] **Phase 7:** Integrate 24/7 Monitoring console with clean "Protect This Website" onboarding.
- [ ] **Phase 8:** Group Agency Tools into a dedicated Agency Workspace.
- [ ] **Phase 9:** Simplify Pricing around 4 clear outcomes.
- [ ] **Phase 10:** Responsive navigation (mobile bottom nav/drawer) and accessibility polish.
- [ ] **Phase 11:** Full test validation (`npm test`, `npm run lint`, `npm run build`).
