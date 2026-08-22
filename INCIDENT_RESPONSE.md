# LeadGuard OS — Operational Incident Response SOP Manual

This document defines standard operating procedures (SOPs) for responding to operational outages, security vulnerabilities, and system failures in LeadGuard OS.

---

## 1. Database Outage SOP
- **Detection**: `/api/ready` returns `503 Service Unavailable` with `database: UNHEALTHY`.
- **Containment**: Storage engine automatically fails over to local disk snapshot mode (`data/leadguard-db.json`).
- **Recovery**: Restart PostgreSQL container (`docker restart leadguard-db`). Verify connection string `DATABASE_URL`.
- **Verification**: Run `curl -i http://localhost:3000/api/ready` to verify `status: "READY"`.
- **Communication**: Post status update to internal ops channel.

---

## 2. Redis / Queue Worker Outage SOP
- **Detection**: Queue depth spike in `/api/metrics` or worker logs emitting `ECONNREFUSED`.
- **Containment**: Requests switch to synchronous execution fallback for critical user scans.
- **Recovery**: Restart Redis container (`docker restart leadguard-redis`) and worker process (`npm run worker`).
- **Verification**: Enqueue test job at `/api/queue/enqueue` and verify job status transitions to `COMPLETED`.

---

## 3. Leaked API Key / Secret SOP
- **Detection**: Audit log notification `UNAUTHORIZED_ACCESS_ATTEMPT` or external secret leak alert.
- **Containment**: Immediately revoke leaked API key via `/api/keys/revoke` or set key active state to `false`.
- **Recovery**: Generate new cryptographically signed key (`lg_live_...`) for impacted service/user. Rotate `JWT_SECRET` in environment variables if JWT key compromised.
- **Verification**: Confirm revoked key returns `401 Unauthorized` on `/api/v1/scans`.

---

## 4. SSRF Emergency Containment SOP
- **Detection**: Security audit log flagging target IP within blocked range (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`).
- **Containment**: `validateAndResolveSafeUrl` blocks the request before HTTP fetch. If new bypass discovered, update `isPrivateOrBlockedIP()` regex in `server/ssrfGuard.ts`.
- **Recovery**: Deploy patch and restart API server.
- **Verification**: Run `npx tsx tests/run-tests.ts` (Test Suite 1 & 20).

---

## 5. Razorpay Webhook Failure / Payment Outage SOP
- **Detection**: Payment captured in Razorpay dashboard but user order status remains `PENDING`.
- **Containment**: Re-send webhook from Razorpay portal.
- **Recovery**: Authoritative HMAC verifier (`verifyPaymentSignature`) validates signature and updates user entitlement.
- **Verification**: Check `/api/entitlements` returns upgraded plan tier.
