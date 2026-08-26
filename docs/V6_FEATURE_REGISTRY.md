# V6 Feature Registry

This registry captures the major product capabilities present in the current repository and their actual implementation status.

| ID | Feature | Description | Current UI | Backend/API | Database | User Type | Dependencies | Current Status | Keep | Refactor | Merge | Move | Remove Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | Website Audit | Core website lead/leak scan with live extraction and scoring | HeroScanner, AuditCommandCenter | POST /api/scan | Scan, Prisma Scan | Visitor / User | Scanner engine, SSRF guard, detector modules | Active | Yes | Yes | No | No | No |
| F-002 | Lead Capture analysis | Detect broken WhatsApp, review links, call buttons, emails, forms | ChannelMatrix, FindingsDetailTabs | POST /api/scan | Scan findings + JSON results | User | WhatsAppDetector + LinksDetector | Active | Yes | Yes | No | No | No |
| F-003 | WhatsApp analysis | Checks malformed +9191/leading zero issues and invalid wa.me routes | ZeroIntentChecker, FindingsDetailTabs | POST /api/scan | Scan.whatsappResults | User | WhatsAppDetector | Active | Yes | Yes | No | No | No |
| F-004 | Click-to-call analysis | Validates tel: links and phone number quality | ChannelMatrix | POST /api/scan | Scan.phoneResults | User | LinksDetector | Active | Yes | No | No | No | No |
| F-005 | Contact forms | Detects forms and broken social/lead funnels | FindingsDetailTabs | POST /api/scan | Scan.findings, form results | User | FormsDetector | Active | Yes | No | No | No | No |
| F-006 | Ad Attribution | Detects UTM, tracking, pixel, GA4, and Meta issues | FourPillarsOverview | POST /api/scan | trackingResults | User | TrackingDetector | Active | Yes | Yes | No | No | No |
| F-007 | Meta Pixel | Checks pixel presence and attribution quality | FourPillarsOverview | POST /api/scan | trackingResults + findings | User | TrackingDetector | Active | Yes | No | No | No | No |
| F-008 | GA4 | Checks for GA4 IDs and tag completeness | FourPillarsOverview | POST /api/scan | trackingResults | User | TrackingDetector | Active | Yes | No | No | No | No |
| F-009 | Conversion events | Tracks conversion-oriented issues and revenue impact | RevenueImpactHero | POST /api/scan | findings + score | User | ScoringEngine | Active | Yes | Yes | No | No | No |
| F-010 | SEO | Indexing, canonical, robots, and technical SEO audits | FourPillarsOverview | POST /api/scan | seoResults + findings | User | SeoDetector | Active | Yes | No | No | No | No |
| F-011 | Indexing | Finds noindex and index suppression | FourPillarsOverview | POST /api/scan | seoResults | User | SeoDetector | Active | Yes | No | No | No | No |
| F-012 | Canonical | Checks canonical tag presence and correctness | FourPillarsOverview | POST /api/scan | seoResults | User | SeoDetector | Active | Yes | No | No | No | No |
| F-013 | Sitemap | Likely part of SEO but not a dominant code-first feature | partially visible | partial | likely in SEO results | User | SeoDetector | Partial | No | No | Yes | No | No |
| F-014 | Security | SSL, headers, CSP, mixed content, cyber scoring | FourPillarsOverview | POST /api/scan | securityResults | User | SecurityDetector | Active | Yes | No | No | No | No |
| F-015 | SSL | Checks HTTPS and certificate posture | Security panel | POST /api/scan | securityResults | User | SecurityDetector | Active | Yes | No | No | No | No |
| F-016 | Headers | Checks security headers, HSTS, CSP | Security panel | POST /api/scan | securityResults | User | SecurityDetector | Active | Yes | No | No | No | No |
| F-017 | CSP | Policy detection | Security panel | POST /api/scan | securityResults | User | SecurityDetector | Active | Yes | No | No | No | No |
| F-018 | Mixed content | HTTP resource issues | Security panel | POST /api/scan | securityResults | User | SecurityDetector | Active | Yes | No | No | No | No |
| F-019 | Lead Health Score | Summary score and health grading | ScoreDashboard, AuditCommandCenter | POST /api/scan | Scan.score + pillarScores | User | ScoringEngine | Active | Yes | Yes | No | No | No |
| F-020 | Four Pillars | lead/ad/seo/cyber score model | FourPillarsOverview | POST /api/scan | Scan.pillarScores | User | ScoringEngine | Active | Yes | Yes | No | No | No |
| F-021 | Business Impact | Revenue estimate and monthly loss calculation | RevenueImpactHero | POST /api/scan | Scan.estimatedMonthlyLoss | User | ImpactCalculator | Active | Yes | Yes | No | No | No |
| F-022 | Revenue Loss | Financial leakage model | RevenueScenarioCalculator | POST /api/scan | findings + impact estimates | User | ImpactCalculator | Active | Yes | Yes | No | No | No |
| F-023 | Revenue Scenario | Scenario calculator / sliders | RevenueScenarioCalculator | POST /api/scan | in-memory only | User | Frontend state | Active | Yes | No | No | No | No |
| F-024 | Funnel Simulator | Click path/lead-funnel simulation | FunnelLeakSimulator | frontend component | no dedicated API | User | frontend business logic | Active | Yes | No | No | No | No |
| F-025 | Mobile Link Simulator | Mobile behavior testing | MobileLinkSimulator | frontend component | none | User | frontend simulation | Active | Yes | No | No | No | No |
| F-026 | AI Remediation | AI-generated action guidance | FixCenter, FindingsDetailTabs | Job queue aiAnalysis | AiReport / Scan.aiReport | User | GoogleGenAI | Active | Yes | Yes | No | No | No |
| F-027 | Findings | Standardized issue list | FindingsDetailTabs | POST /api/scan | findings JSON | User | FindingBuilder | Active | Yes | No | No | No | No |
| F-028 | Fix Center | Fixes and action guidance | FixCenter | API + UI | Scan results + AI fields | User | scanner, AI, reports | Active | Yes | Yes | No | No | No |
| F-029 | Free Fix | Free issue entry point | FreeFixAndLockedPaywall | UI + pricing gate | none | User | Frontend + panel logic | Active | Yes | No | No | No | No |
| F-030 | Express Fix | Paid remediation service | ExpressFixModal, MonetizationVault | payment + fulfillment | Order, Fulfillment | User | pricing + payment + order repo | Active | Yes | Yes | No | No | No |
| F-031 | Verification Matrix | Evidence-based validation of findings | FindingsDetailTabs | POST /api/scan | findings metadata | User | Scanner | Active | Yes | No | No | No | No |
| F-032 | Monitoring | Watchdog monitoring service | MonitoringView, WatchdogConsole | watchdog routes + jobs | Watchdog + WatchdogCheckLog | User | watchdogRepository + scheduler | Active | Yes | Yes | No | No | No |
| F-033 | Watchdog | 24/7 recurring monitor | WatchdogModal | POST /api/watchdog/subscribe + queue | Watchdog | User | scheduler + worker | Active | Yes | Yes | No | No | No |
| F-034 | Scheduled scans | cron-like recurring website checks | SchedulesView | /api/schedules endpoints | ScanSchedule local storage | User | scheduler + queue | Partial | Yes | Yes | No | No | No |
| F-035 | Alerts | Notification channels for incidents | WatchdogConsole | webhook + notification tasks | NotificationDelivery | User | queue + webhooks | Partial | Yes | Yes | No | No | No |
| F-036 | Reports | Summary report generation and retrieval | ReportsView, PublicReportView | /api/report/:token, /api/scan/:id | ReportShare, Scan | User | reportManager + PDF repo | Active | Yes | Yes | No | No | No |
| F-037 | Public reports | Public tokenized report | PublicReportView | GET /api/report/:token | ReportShare | Visitor | reportManager | Active | Yes | No | No | No | No |
| F-038 | PDF reports | PDF generation pipeline | ReportsView | generatePdf job | PdfReport + storage | User | pdfReportRepository + queue | Active | Yes | Yes | No | No | No |
| F-039 | Share links | shareable report URLs | ShareableReportModal | POST /api/v1/reports/share | ReportShare | User | reportManager | Active | Yes | No | No | No | No |
| F-040 | Intelligence | executive and product intelligence | ExecutiveDashboardView, IntelligenceView | API + analytics | statsRepository | User / Admin | analytics + scan stats | Active | Yes | Yes | No | No | No |
| F-041 | Executive dashboard | KPI view for performance | ExecutiveDashboardView | /api/dashboard | stats + scan history | Admin / User | dashboard aggregates | Active | Yes | Yes | No | No | No |
| F-042 | Zero Intent | WhatsApp route quality for prefilled intent | ZeroIntentChecker | POST /api/scan | findings | User | scanner logic | Active | Yes | No | No | No | No |
| F-043 | Cart Leakage | E-commerce funnel leak detection | CartDeathMonitor | likely scanner logic | ecommerce fields | User | scanning + scoring | Partial | No | No | Yes | No | No |
| F-044 | Competitive Radar | competitor monitoring and sabotage analysis | CompetitorSpy, CompetitorSabotageRadar | mostly frontend + mock data | no canonical data layer | User / Agency | front-end intelligence | Partial | Yes | Yes | No | No | No |
| F-045 | Agency | multi-client product layer | AgencyView, AgencyWorkspaceView | API + pricing + usage | User / Organization | Agency | agency domain pieces | Active | Yes | Yes | No | No | No |
| F-046 | Clients | agency client management | AgencyWorkspaceView | likely frontend-only | no stable model | Agency | agency UI + reps | Partial | Yes | Yes | No | No | No |
| F-047 | Prospect Hunter | prospects and cold outreach | HunterMode | frontend + external logic | no strong repo model | Agency | data collection + pitch | Partial | Yes | Yes | No | No | No |
| F-048 | Pitch generation | AI pitch generation for leads | AgencyPitchSuite | UI + AI service | no clear persistence | Agency | AI + agency data | Partial | Yes | Yes | No | No | No |
| F-049 | White-label reporting | agency branded PDFs/reports | agency components | payment + report templates | ReportShare + PDF | Agency | report generation | Partial | Yes | Yes | No | No | No |
| F-050 | Developer Portal | API docs, API key access, developer tools | DeveloperDashboardView | /api/v1 router + OpenAPI | ApiKey + Webhook | Developer | auth + API keys | Active | Yes | No | No | No | No |
| F-051 | API | developer access to scans and watchdogs | DeveloperDashboardView | /api/v1/
 | ApiKey + DB | Developer | API key auth | Active | Yes | No | No | No | No |
| F-052 | Webhooks | outbound event delivery | WebhooksManager | webhook routes and dispatchers | Webhook + WebhookDelivery | User / Developer | webhookPlatform | Active | Yes | Yes | No | No | No |
| F-053 | Billing | payments and checkout | BillingView, PricingView | payment service + order API | Order + Payment | User | Razorpay + pricing | Active | Yes | Yes | No | No | No |
| F-054 | Payments | Razorpay signed verification | PricingView, MonetizationVault | paymentService + order APIs | Order + PaymentEvent | User | Razorpay | Active | Yes | No | No | No | No |
| F-055 | Admin | operational console | AdminDashboardView | internal admin routes | stats + audit logs | Admin | dashboard and repo | Active | Yes | No | No | No | No |
| F-056 | Reviews | social trust + testimonial flow | TestimonialsWall, ReviewSubmissionModal | no real backend | local frontend state | User | frontend only | Active | Yes | No | No | No | No |
| F-057 | Blog / Knowledge Hub | content marketing | BlogHubView | likely static frontend | none | Visitor | frontend content state | Active | Yes | No | Yes | No | No |
| F-058 | Theme | design themes and visual treatment | App-wide CSS | frontend assets | none | Visitor | CSS + config | Active | Yes | No | Yes | No | No |
| F-059 | Language | multilingual labels and translations | LanguageContext | frontend resource maps | none | Visitor / User | context state | Active | Yes | No | Yes | No | No |
| F-060 | Auth | traditional app auth + JWT + Firebase transitional | AuthModal + context | middleware + authService | User + RefreshToken | User | Firebase + JWT | Active | Yes | Yes | No | No | No |
| F-061 | Role authorization | admin/agency role gating | gated components | requireRole, auth middleware | User.role | User / Admin | auth middleware | Active | Yes | No | No | No | No |
| F-062 | Data export | report export and JSON archive | AccountSettingsView | /api/scan/:id/export | Scan + report repo | User | report storage | Active | Yes | No | No | No | No |
| F-063 | Live monitoring | watchdog jobs and runWatchdog execution | MonitoringView | worker jobs | PostgreSQL + local cache | User | queue + scheduler | Active | Yes | Yes | No | No | No |
| F-064 | AI feature scaffolding | Gemini summary generation on scans | AuditCommandCenter | /api/scan + worker | AiReport table | User | GoogleGenAI | Active | Yes | Yes | No | No | No |

## Interpretation

The strongest and most durable features are the core audit engine, the revenue-impact model, the watchdog monitoring concept, the public report/share layer, and the payment/entitlement model. The most at-risk features are the ones that rely on front-end-only state or are not yet backed by consistent ownership in the database.

## V6 recommendation

Preserve and productize:
- Website Audit
- Lead capture analysis
- Ad attribution
- SEO + security findings
- Monitoring and watchdog
- Reports and share links
- Billing and entitlement

Merge or narrow:
- Agency tooling should be abstracted as a separate domain rather than part of the main app shell.
- Review/blog/theme/language modules are marketing/support features and should not be in the core runtime.
- Funnel simulator, mobile sandbox, and competitor tools should be re-evaluated as distinct product experiences, not scattered UI appendages.

