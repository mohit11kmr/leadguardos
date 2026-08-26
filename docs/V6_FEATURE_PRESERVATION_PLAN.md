# LeadGuard OS V6 Feature Preservation Plan

Every registered feature is assigned a target owner and verification path. “Narrow” means preserve the capability but revisit product prominence; it is not a Phase 3 deletion.

| ID | Current implementation | Target domain/UI | Target API/data | Phase | Verification |
|---|---|---|---|---|---|
| F-001 | HeroScanner, AuditCommandCenter | Audit workspace | `POST /audits`, `Scan` | 3A | live scan E2E |
| F-002-F-005 | channel/findings detectors | Audit findings | audit result/finding DTO | 3A | detector unit tests |
| F-006-F-008 | tracking detector/pillar UI | Audit + Intelligence | findings/pillar contract | 3A | fixture scans |
| F-009 | conversion scoring | Intelligence | impact projection | 3A | score/impact tests |
| F-010-F-012 | SEO detector | Audit findings | `Scan.seoResults` | 3A | SEO fixtures |
| F-013 | partial sitemap | Audit, narrow | explicit SEO finding or documented narrow scope | 3B | capability test or registry status |
| F-014-F-018 | security detector | Audit/Security presentation | security findings | 3A | security fixtures |
| F-019-F-022 | score/impact components | Audit/Intelligence | score and revenue DTOs | 3A | golden result tests |
| F-023-F-025 | frontend calculators/simulators | Audit/Intelligence local tools | no authority; optional tool endpoints later | 3B | component tests |
| F-026 | AI service + queue | Audit AI worker | `aiAnalysis`, `AiReport` | 3C | safety and persistence tests |
| F-027-F-031 | finding builder/fix/verification UI | Audit | findings contract | 3A | result regression |
| F-032-F-035 | MonitoringView/watchdog/schedules/alerts | Monitoring | targets, schedules, check logs, delivery jobs | 3D | worker/integration tests |
| F-036-F-039 | Reports/public/PDF/share | Reports | report/share/PDF APIs | 3E | public/share/PDF E2E |
| F-040-F-042 | intelligence dashboard/zero intent | Intelligence/Audit | derived intelligence APIs | 3B | aggregate and fixture tests |
| F-043 | CartDeathMonitor partial | Intelligence, narrow | explicit capability contract or registry narrow | 3B | fixture/decision test |
| F-044 | competitor radar frontend/mock | Intelligence/Agency, narrow | API only after evidence-backed implementation | 3B | no mock-data production assertion |
| F-045-F-049 | agency workspace/prospect/pitch/white-label | Agency | agency APIs, org/client future tables | 3F | agency authorization E2E |
| F-050-F-052 | developer dashboard/API/webhooks | Developer | scoped keys, `/developer`, webhook tables/jobs | 3D | contract tests |
| F-053-F-055 | billing/payment/admin | Billing/Admin | orders/payments/entitlements/admin APIs | 3G | payment and role tests |
| F-056-F-059 | reviews/blog/theme/language | Marketing/Web presentation | static/client state; feedback endpoint where real | 3B | public smoke tests |
| F-060-F-061 | AuthModal/context/role gates | Identity/session + layouts | canonical auth APIs/ActorContext | 3H | auth/privilege E2E |
| F-062-F-064 | export, live monitoring, AI scaffolding | Reports/Monitoring/Audit | export/jobs/AI contracts | 3C-3E | regression and job tests |

## Preservation Rules

No feature is orphaned by moving files. A feature may be marked narrow only with a documented user-visible behavior, owner, API/data decision, and verification test. Frontend-only calculators remain non-authoritative; competitor and sitemap features must not fabricate backend support. Existing public report links and payment/security behavior receive compatibility tests before route migration.
