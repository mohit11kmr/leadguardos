# LeadGuard OS — Complete Feature Registry & V3 Location Map

**Version:** 3.0.0 Enterprise SaaS  
**Principle:** **DO NOT REDUCE FEATURES. REDUCE COGNITIVE COMPLEXITY.**  
Every existing meaningful capability remains accessible, contextualized, and fully functional.

---

| Feature ID | Feature Name | Existing Component | Category | User Persona | V3 Location / Access Path | Status |
|---|---|---|---|---|---|---|
| **LG-001** | WhatsApp Routing & +9191 Bug Scanner | `HeroScanner`, `FindingsDetailTabs` | Lead Capture | All | **Audit → Overview / Lead Capture / Fix Center** | Active & Production Ready |
| **LG-002** | Zero-Intent WhatsApp Message Optimizer | `ZeroIntentChecker` | Lead Capture | Marketers / SMBs | **Intelligence → Zero-Intent & Audit → Lead Capture** | Active & Production Ready |
| **LG-003** | Click-to-Call Dialer Health Probe | `ChannelMatrix`, `FindingsDetailTabs` | Lead Capture | SMBs | **Audit → Lead Capture & Verification Matrix** | Active & Production Ready |
| **LG-004** | Email & Mailto Syntax Validator | `ChannelMatrix` | Lead Capture | SMBs | **Audit → Lead Capture & Verification Matrix** | Active & Production Ready |
| **LG-005** | Google Business Profile & Review Linker | `ChannelMatrix` | Lead Capture | Local SMBs | **Audit → Lead Capture & Verification Matrix** | Active & Production Ready |
| **LG-006** | AdShield Meta Pixel Inspector (`fbq`) | `FourPillarsOverview`, `FindingsDetailTabs` | Ad Tracking | Marketers / Agencies | **Audit → Advertising & Fix Center** | Active & Production Ready |
| **LG-007** | GA4 Measurement Protocol & GTM Probe | `FourPillarsOverview`, `FindingsDetailTabs` | Ad Tracking | Marketers / Agencies | **Audit → Advertising & Fix Center** | Active & Production Ready |
| **LG-008** | Conversion Event Dropoff Estimator | `RevenueScenarioCalculator` | Ad Tracking | Marketers / Agencies | **Intelligence → Revenue Scenario & Audit → Funnel** | Active & Production Ready |
| **LG-009** | Funnel Leakage Simulator | `FunnelLeakSimulator` | Ad Tracking | Marketers / Agencies | **Intelligence → Funnel Simulator & Audit → Funnel** | Active & Production Ready |
| **LG-010** | SEO Google Indexing Penalty Probe (`noindex`) | `FourPillarsOverview`, `FindingsDetailTabs` | SEO | SEOs / Marketers | **Audit → SEO & Indexing & Fix Center** | Active & Production Ready |
| **LG-011** | Canonical Tag Mismatch & Conflict Scanner | `FourPillarsOverview`, `FindingsDetailTabs` | SEO | SEOs / Marketers | **Audit → SEO & Indexing & Fix Center** | Active & Production Ready |
| **LG-012** | Social Preview & OpenGraph Checker | `ChannelMatrix` | SEO / Social | Marketers | **Audit → SEO & Verification Matrix** | Active & Production Ready |
| **LG-013** | SSL/TLS Expiry & Mixed Content Probe | `FourPillarsOverview`, `FindingsDetailTabs` | Security | Sysadmins / SMBs | **Audit → Security & Fix Center** | Active & Production Ready |
| **LG-014** | Security Headers & CSP/HSTS Policy Scanner | `FourPillarsOverview`, `FindingsDetailTabs` | Security | Developers / Sysadmins | **Audit → Security & Fix Center** | Active & Production Ready |
| **LG-015** | Server-Side SSRF & Network Defense | `server/security/safeFetch.ts` | Security | Enterprise | **Backend Network Security Layer** | Active & Production Ready |
| **LG-016** | Transparent Revenue Impact & Loss Model | `ScoreDashboard`, `RevenueScenarioCalculator` | Intelligence | Business Owners | **Audit → Overview & Intelligence → Revenue** | Active & Production Ready |
| **LG-017** | 24/7 Watchdog Heartbeat Monitor & Alerts | `WatchdogConsole`, `WatchdogModal` | Monitoring | Business Owners | **Monitoring → 24/7 Radar Console** | Active & Production Ready |
| **LG-018** | Automated Schedules & Recurring Audits | `SchedulesView` | Monitoring | Business Owners | **Monitoring → Automated Schedules** | Active & Production Ready |
| **LG-019** | Incident Webhooks & HMAC Signatures | `WebhooksManager` | Developer | Developers / Agencies | **Developer Portal → Webhooks & More → Developer** | Active & Production Ready |
| **LG-020** | Competitor Sabotage Radar & Growth Spy | `CompetitorSabotageRadar`, `CompetitorSpy` | Intelligence / Agency | Agencies / Growth | **Agency → Competitor Radar & Intelligence** | Active & Production Ready |
| **LG-021** | E-Commerce Cart Death & Checkout Monitor | `CartDeathMonitor` | E-Commerce | D2C Brands | **Intelligence → Cart Leakage & Audit** | Active & Production Ready |
| **LG-022** | Agency 500-Site Lead Hunter | `BatchProspectScanner`, `HunterMode` | Agency | Agencies / Sales | **Agency → Prospect Hunter** | Active & Production Ready |
| **LG-023** | Hinglish / English AI Cold Pitch Generator | `AgencyPitchSuite` | Agency | Agencies / Sales | **Agency → AI Cold Pitch Suite** | Active & Production Ready |
| **LG-024** | Agency Client Workspace & Custom Branding | `AgencyWorkspaceView` | Agency | Agencies | **Agency → Client Workspace** | Active & Production Ready |
| **LG-025** | Public Shareable Cryptographic Reports | `PublicReportView`, `ShareableReportModal` | Reports | All | **Reports → Share Audit / `/report/:token`** | Active & Production Ready |
| **LG-026** | White-Label Branded Client PDF Generator | `pdfGenerator.ts`, `ScoreDashboard` | Reports | Agencies | **Audit / Reports → Download PDF** | Active & Production Ready |
| **LG-027** | Device-Specific Link Simulator (iOS/Android/Web) | `MobileLinkSimulator`, `LinkDebuggerSandbox` | Utility | QA / Marketers | **Audit → Mobile Experience & Agency Tools** | Active & Production Ready |
| **LG-028** | Auto-Fix Script Studio & Widget Generator | `AutoFixScriptStudio`, `WidgetGenerator` | Utility | Developers | **Agency → Diagnostic Studio & More** | Active & Production Ready |
| **LG-029** | Executive Intelligence & Risk Trends | `ExecutiveDashboardView` | Intelligence | Leadership | **Intelligence → Executive Dashboard** | Active & Production Ready |
| **LG-030** | AI Remediation & Fix Generator | `ai.service.ts`, `App.tsx` | AI | All | **Audit → AI Fixes & Fix Center** | Active & Production Ready |
| **LG-031** | 3-Tier Monetization & UPI/Razorpay Checkout | `MonetizationVault`, `PricingView` | Commerce | Customers | **Pricing → Plans & Checkout** | Active & Production Ready |
| **LG-032** | Express 48h Done-For-You Emergency Fix | `ExpressFixModal` | Commerce | Customers | **Audit / Pricing → Express Fix (₹2,999)** | Active & Production Ready |
| **LG-033** | Developer Portal (API Keys & OpenAPI Spec) | `DeveloperDashboardView` | Developer | Developers | **Account / More → Developer Portal** | Active & Production Ready |
| **LG-034** | Role-Gated Admin System Dashboard | `AdminDashboardView` | Admin | Superadmins | **Account → Admin Overview (Role-gated)** | Active & Production Ready |
| **LG-035** | Billing & Subscription Management | `BillingView` | Account | Customers | **Account → Billing & Invoices** | Active & Production Ready |
| **LG-036** | Account Profile & Security Settings | `AccountSettingsView` | Account | Users | **Account → Settings** | Active & Production Ready |
| **LG-037** | Verified Client Testimonials Wall | `TestimonialsWall`, `ReviewSubmissionModal` | Social Proof | All | **Help / More → Client Reviews** | Active & Production Ready |
| **LG-038** | SEO Knowledge Hub & B2B Guides | `BlogHubView` | Content | All | **Help / More → Knowledge Hub & Articles** | Active & Production Ready |
| **LG-039** | Real-Time Global Scan & Fix Counters | `ScanCounterStats` | Trust | All | **Audit → Global Stats Bar** | Active & Production Ready |
| **LG-040** | Direct Founder Support & Services Catalog | `ContactUsModal`, `ServicesCatalogModal` | Support | All | **Help → Founder Support (+91 83070 70605)** | Active & Production Ready |

---

## 🎯 Verification Rule
No item in this registry has been deleted or degraded. Every capability has a dedicated navigation route or contextual workspace tab.
