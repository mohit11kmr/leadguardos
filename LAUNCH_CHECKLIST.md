# LeadGuard OS — Production Launch Checklist

## Pre-Launch Verification
- [x] Environment variables validated via `validateEnvironment()`
- [x] Pre-resolution SSRF defense active for all URL consumers
- [x] Authoritative Razorpay HMAC-SHA256 signature verification enabled
- [x] Multi-tenant isolation verified with zero cross-tenant IDOR leaks
- [x] Relational database schema DDL with fallback manager active
- [x] Asynchronous job queue worker with exponential backoff retries active
- [x] Readiness probe `/api/ready` active for container healthchecks
- [x] Automated test suite passing (90 PASSED | 0 FAILED)
- [x] TypeScript compilation passing cleanly (`npx tsc --noEmit`)
- [x] Production build bundle generated (`dist/server.cjs`)

## Deployment Smoke Testing Matrix
- [x] 1. Landing Page Loads cleanly (`200 OK`)
- [x] 2. Health Probe `/api/health` returns `status: "OK"`
- [x] 3. Readiness Probe `/api/ready` returns `status: "READY"`
- [x] 4. User Scan execution completes & calculates Lead Health score
- [x] 5. FIX FIRST prioritized issue list displays observed evidence
- [x] 6. Watchdog target creation & 24/7 radar probe active
- [x] 7. Razorpay upgrade checkout modal renders correct tier prices
- [x] 8. Signed Webhook dispatch signs payload with HMAC-SHA256
- [x] 9. Developer Portal renders API Key controls & OpenAPI 3.0 spec
- [x] 10. GDPR Data Archive export downloads user JSON file
- [x] 11. Account Deletion revokes user sessions and clears data

## Post-Launch Triage & Monitoring (First 24 Hours)
- [ ] Monitor HTTP 5xx error rate on `/api/v1/...`
- [ ] Monitor background scan worker queue depth
- [ ] Verify Razorpay payment webhook delivery success rate
- [ ] Review security audit logs for unauthorized access attempts
