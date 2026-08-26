# LeadGuard OS V6 Deployment Architecture

## Production Topology

```text
app.leadguardos.com -> CDN/frontend hosting -> apps/web static assets
api.leadguardos.com -> HTTPS load balancer -> apps/api containers
worker.leadguardos.internal -> autoscaled apps/worker processes
                         |                     |
                         +-> managed PostgreSQL <-+
                         +-> object storage (PDFs/reports)
                         +-> payment/AI/notification providers
```

Web and API may use separate subdomains. CORS on API allows only configured web origins and approved developer origins. Public report URLs remain compatible with existing `/report/:id` and `/report/share/:token` paths through web/API routing.

## Environment Boundaries

Development: local Vite web, API on `3000`, worker process, Docker PostgreSQL on `5432`, optional local object directory. Test: isolated database/schema, fake providers, deterministic queue. Staging: separate database, keys, object bucket, webhook endpoints, and origins. Production: managed PostgreSQL, durable queue tables, object storage, provider secrets, and no local storage authority.

Required server secrets include `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_SECRET`, provider webhook secrets, and any enabled AI/SMTP/notification credentials. `packages/config` contains no secrets. Secret manifests are validated at startup and injected by the deployment platform, never committed or sent to web.

## Services and Health

- Web: static asset health is CDN/hosting availability; build output is immutable.
- API: `/api/v1/health` liveness; `/api/v1/ready` checks PostgreSQL and queue connectivity.
- Worker: process heartbeat/lease activity and queue depth; expose internal health only.
- PostgreSQL: managed backups, PITR, connection pool limits, migration status.
- Object storage: bucket health, digest verification for report bytes.

## Scaling and Operations

API scales horizontally and remains stateless except for short caches. Worker scales by queue class and uses atomic claims/leases. PostgreSQL is scaled vertically/read replicas only for derived reads; writes remain primary. Batch scans have quotas and bounded concurrency. Rate limiting moves from process-local Map to a distributed limiter at the edge/API infrastructure. Logs are structured, correlated by request/job ID, redacted, and shipped centrally. Metrics cover latency, scan failures, queue age, retries, dead letters, provider failures, payment verification, and auth failures.

## Webhook and Payment Boundaries

Provider webhooks terminate at API ingress with raw-body signature verification, event-id idempotency, and fail-closed processing. User webhooks are sent only by the worker through SSRF-safe outbound fetch, signed with a server-held secret, and logged in `WebhookDelivery`. Payment amounts are calculated from the Billing catalog; provider confirmation, currency, signature, state transition, and exactly-once fulfillment are server-side.

## Deployment Safety

Each app builds independently from shared packages. CI produces versioned artifacts and deploys web, API, and worker separately. Database migrations run as a gated release step before API rollout, with backward-compatible schema changes first. API and worker versions must support the same job contract during rolling deploys. Rollback never rolls the database backward automatically; use additive compatibility migrations and a forward repair migration if needed.
