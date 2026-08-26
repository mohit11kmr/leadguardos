# LeadGuard OS V6 Data Ownership

PostgreSQL is the canonical source of truth. Prisma schema and migrations remain root-level during Phase 3; application boundaries access it through domain repositories. Local JSON, Maps, Firebase/Firestore, and client Firebase state are compatibility or cache mechanisms only.

| Entity / data | Domain owner | Canonical DB/table | Read by | Written by | Legacy source | Migration/retirement |
|---|---|---|---|---|---|---|
| User/profile/role | Identity | `User` | all domains via actor contract | Identity/Admin policy | local users, Firebase user | backfill Postgres; legacy read-only then remove |
| Refresh/session token | Identity | `RefreshToken` | Identity | Identity | none | already canonical |
| Developer key | Developer | `ApiKey` | Developer/auth | Developer | in-memory cache | migrate existing hashes; cache-only dev |
| Audit scan | Audit | `Scan` | Audit, Intelligence, Reports, Monitoring | Audit worker/service | `data/leadguard-db.json`, storage Map | import; Postgres-only production |
| Findings/pillar scores | Audit | `Scan.findings`, `pillarScores` JSON | Audit, Intelligence, Reports | Audit scanner/aggregator | legacy scan JSON | normalize DTO, preserve JSON during transition |
| AI remediation | Audit | `AiReport` | Audit, Reports | AI worker | scan embedded AI fields | backfill if trustworthy; recompute invalid records |
| PDF metadata | Reports | `PdfReport` | Reports/Admin | Reports worker | local Map | import metadata; Postgres authority |
| PDF bytes | Reports infrastructure | object storage path | authorized Reports API | Reports worker | `data/pdf-reports` | upload/verify digest; delete local after receipt |
| Watchdog target | Monitoring | `Watchdog` | Monitoring, Agency/Admin | Monitoring API/worker | local storage, Firestore | import; reconcile duplicates; Postgres only |
| Watchdog check log | Monitoring | `WatchdogCheckLog` | Monitoring, Intelligence, Admin | Monitoring worker | local cache/Firestore | import with target mapping |
| Schedule | Monitoring | future `MonitoringSchedule` or explicit Watchdog fields | Monitoring | Monitoring service | `ScanSchedule` local JSON | migration-only read; consolidate with target schedule |
| Order | Billing | `Order` | Billing, Admin | Billing service/webhooks | local orders | import state-machine-safe |
| Payment | Billing | `Payment` | Billing/Admin | provider webhook/verification | embedded order/payment fields | backfill provider references |
| Payment event | Billing | `PaymentEvent` | Billing/Admin | webhook ingress | none/legacy logs | dedupe by provider/event ID |
| Fulfillment | Billing | `Fulfillment` | Billing/Agency/Monitoring | Billing service | local fulfillment Map | import only confirmed paid orders |
| Subscription | Billing | `Subscription` | Billing/Identity | Billing provider/reconciliation | plan inference | explicit subscription backfill/review |
| Entitlement | Billing | `Entitlement` | all feature policies | Billing/Admin grant | role-based plan inference | materialize grants, expire inferred grants |
| Usage | Billing | `UsageRecord` | Billing/Intelligence | domain usage events | storage counters | reconcile from events/scans; then authoritative |
| Webhook config | Developer | `Webhook` | Developer/Monitoring | Developer API | local storage | import secrets only through controlled migration |
| Webhook delivery | Developer | `WebhookDelivery` | Developer/Admin | Worker | local delivery arrays | import logs; worker owns new deliveries |
| Audit/security log | Admin/Observability | existing audit log table/repository target | Admin/security | all services via event API | local audit storage | preserve immutable records |
| Feature/config metadata | Platform | versioned config/package | Web | release process | `src/config/features.ts`, `APP_CONFIG` | move non-secret values to packages/config |
| Marketing reviews/blog/theme/language | Marketing/Web | none required initially | Web | Web/admin workflow if later | component state/static files | remain presentation/static; no fake DB authority |

## Store Classification

- Prisma/Postgres: canonical production authority for all durable business entities above.
- Local JSON and in-memory Maps: development/test fallback only; no production writes after cutover.
- Firestore/Firebase Admin: migration adapter or explicitly temporary read-only compatibility source; no new writes.
- Firebase client data: never identity authority; remove from production auth flow after migration.
- Caches: may accelerate reads, must have TTL/invalidation and never grant access or change business state.

## Migration Controls

Every import is idempotent, preserves original IDs where safe, records source and migration batch, validates ownership references, and produces a rejected-row report. Payments, entitlements, public tokens, and report links require special replay tests. No legacy store is deleted until two successful reconciliation runs, backup verification, and rollback approval.
