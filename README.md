# 🛡️ LeadGuard OS — Revenue & Ad Spend Shield

> **Autonomous Lead Leakage, Conversion Audit & Ad Spend Shield for Indian & Global SMBs and Digital Agencies.**

LeadGuard OS is an enterprise-grade web application and SaaS platform engineered to detect broken lead conversion channels, dead WhatsApp routing (+9191 bug, 0-prefix, missing country code), click-to-call failures, absent Meta Pixels/GA4 tags, Google search `noindex` penalties, and security risks.

---

## 📑 Table of Contents
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [4-Pillar Diagnostic Engine](#-4-pillar-diagnostic-engine)
- [Security & SSRF Hardening](#-security--ssrf-hardening)
- [Payment & Order Security](#-payment--order-security)
- [Feature Registry (LG-001 to LG-028)](#-feature-registry-lg-001-to-lg-028)
- [API Reference](#-api-reference)
- [Local Setup & Testing](#-local-setup--testing)

---

## 🏗️ Architecture & Tech Stack

```
                              ┌────────────────────────────────────────┐
                              │       Express.js Server (server.ts)    │
                              └───────────────────┬────────────────────┘
                                                  │
         ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
         ▼                        ▼                               ▼                        ▼
┌──────────────────┐    ┌──────────────────┐            ┌──────────────────┐     ┌──────────────────┐
│ Middleware Layer │    │ Security Module  │            │ Payment Services │     │ Storage Engine   │
│ - auth.ts (JWT)  │    │ - safeFetch.ts   │            │ - paymentService │     │ - storage.ts     │
│ - rateLimiter    │    │ - ssrfGuard.ts   │            │   (HMAC Razorpay)│     │ - repositories/  │
└──────────────────┘    └──────────────────┘            └──────────────────┘     └──────────────────┘
```

### Stack Components:
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons, jsPDF.
* **Backend**: Node.js, Express, TypeScript, Google Gemini AI (`@google/genai`).
* **Security & Auth**: JWT Bearer Auth, API Keys, SSRF Guard (`safeFetch`), HMAC SHA-256 Webhook/Payment signing.
* **Storage**: In-memory Map data structure with atomic disk JSON persistence and clean repository pattern.

---

## 🛡️ 4-Pillar Diagnostic Engine

1. **Lead Capture Shield (35% Weight)**
   - WhatsApp link syntax verification (+9191 double prefix, leading 0 prefix, missing +91).
   - Click-to-call `tel:` link format inspection.
   - Contact form & CTA button validation.

2. **Ad & Attribution Shield (25% Weight)**
   - Meta Pixel (`fbq`) tracking script presence.
   - Google Analytics 4 (`G-XXXXX`) & GTM tags.
   - Conversion event tracking & ad spend wastage calculator.

3. **SEO & Visibility Shield (20% Weight)**
   - Google indexing check (`<meta name="robots" content="noindex">`).
   - Canonical URL consistency.
   - XML Sitemap & Robots.txt health.

4. **Cyber & Security Shield (20% Weight)**
   - SSL/HTTPS encryption status.
   - Mixed content HTTP resources on HTTPS pages.
   - Security headers (`Content-Security-Policy`, `X-Frame-Options`).
   - Open admin/config path exposure.

---

## 🔒 Security & SSRF Hardening

LeadGuard OS includes a centralized **SSRF Guard (`safeFetch`)** in `server/security/safeFetch.ts`:
* **Pre-resolution DNS validation**: Resolves hostname via `dns.promises.lookup` before connection.
* **Restricted Network Blocking**: Blocks IPv4 loopback (`127.0.0.0/8`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Carrier-Grade NAT (`100.64.0.0/10`), Link-Local (`169.254.0.0/16`), Cloud Metadata (`169.254.169.254`, `metadata.google.internal`), and IPv6 loopback/ULA.
* **Safe Redirect Follower**: Re-evaluates redirect destination URLs against the SSRF guard on every hop (max 3 redirects).
* **Timeouts & Limits**: Enforces 10s connection timeout and 5MB response size limit.

---

## 💳 Payment & Order Security

- **Server-Side Price Calculation**: Product prices are strictly calculated on the server via `calculateTierPrice(tierId)` lookup. Client-supplied amounts are ignored.
- **State Machine**: Orders transition through `CREATED` ➔ `PAYMENT_PENDING` ➔ `PAID` / `FAILED`.
- **HMAC Verification**: Payments must be verified via HMAC-SHA256 signature verification (`POST /api/monetization/verify-payment`) matching Razorpay/Stripe payload format.

---

## 📋 API Reference

### 1. Website Scan API
```http
POST /api/scan
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### 2. 24/7 Watchdog Registration
```http
POST /api/watchdog/subscribe
Content-Type: application/json

{
  "targetUrl": "https://example.com",
  "contact": "+919876543210",
  "channel": "WHATSAPP",
  "frequency": "DAILY"
}
```

### 3. Order Creation API
```http
POST /api/monetization/order
Content-Type: application/json

{
  "tierId": "tier-express-fix",
  "paymentMethod": "UPI"
}
```

### 4. Verify Payment Signature API
```http
POST /api/monetization/verify-payment
Content-Type: application/json

{
  "orderId": "ord_1700000000_abcd",
  "razorpayOrderId": "order_xyz123",
  "razorpayPaymentId": "pay_999",
  "razorpaySignature": "hmac_sha256_signature_string"
}
```

### 5. Razorpay Standard Checkout (Live Flow)
The frontend (`src/utils/razorpayCheckout.ts`) drives the full checkout:

1. `POST /api/monetization/order` — server computes the price from the
   authoritative catalog (Express Fix ₹2,999 / Watchdog ₹299/mo / Agency
   ₹4,999/mo), creates a PENDING order, and calls the Razorpay Orders API.
   The internal order is durably bound to the provider `order_id`.
2. The Razorpay modal opens with the returned `order_id` (public KEY_ID only —
   KEY_SECRET never leaves the server).
3. On success, the handler posts `razorpay_payment_id`, `razorpay_order_id`,
   and `razorpay_signature` back to `/api/monetization/verify-payment`.
4. The server verifies HMAC-SHA256(order|payment), then **additionally fetches
   the payment from Razorpay's API** to confirm amount, currency, and capture
   status before marking PAID (fail-closed: unconfirmable payments are never
   fulfilled).
5. Fulfillment is exactly-once via a durable transactional claim.

Environment: set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in `.env`
(gitignored). Test cards work in test mode via the standard modal.

---

## 🗄️ Data Layer — PostgreSQL (production source of truth)

Production persistence runs exclusively on **PostgreSQL via Prisma**.
`DATABASE_URL` is REQUIRED in production — the server refuses to boot without it
(no JSON/Firestore fallback exists). The legacy local-JSON engine is a marked
development/test adapter only.

```bash
npx prisma migrate dev        # apply schema (dev)
npm run migrate:deploy        # production migrations
npm run db:generate           # regenerate Prisma client after schema edits
npm run test:pg               # 34-check migration suite against real DB
npm run migrate:firestore:dry-run   # inspect legacy Firestore data
npm run migrate:firestore           # idempotent import (never deletes source)
```

See `MIGRATION.md` for the full Firebase → PostgreSQL migration guide.

## 🚀 Local Setup & Testing

### 1. Install Dependencies
```bash
bun install  # or npm install
```

### Post-Deployment Verification Checklist
Run these after deploying to real GCP infrastructure (Cloud Run/GKE + Firestore + Storage):

0. **Firestore durable-semantics suite (no GCP project needed)** — verify the REAL production
   code paths against the Firestore Emulator:
   ```bash
   # Requires Java 21+
   npx firebase-tools emulators:start --only firestore   # terminal 1
   npm run test:emulator                                 # terminal 2 (15 checks)
   # Real-latency queue load test:
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=leadguardos-emulator \
   NODE_ENV=production STORAGE_MODE=firestore npx tsx tests/queue-load-firestore.ts --jobs=200 --workers=8
   ```
   Measured reference (emulator, 8 workers): 200/200 completed, 0 lost, throughput 2.2 jobs/s
   incl. per-op transactions ≈ 187k jobs/day capacity vs. 3,334/day needed for 100k/month.
1. **Durable queue under real latency**: `npx tsx tests/load-test.ts --jobs=1000 --workers=10` against a staging deployment with `NODE_ENV=production` — re-measure P50/P95/P99 with live Firestore round-trips and document results.
2. **Worker crash recovery**: terminate a worker pod mid-load; verify lease expiry recovery (`jobExecutions.recoveryCount`) and zero lost jobs.
3. **Shared rate limiting**: hit an endpoint from 2+ instances with one IP; confirm counters are shared (`rateLimits` collection) and 429s coordinate globally.
4. **Payment webhook end-to-end**: register `https://<domain>/api/payments/webhook` in Razorpay dashboard, make one test-mode capture, verify exactly-once fulfillment in the `fulfillments` collection.
5. **PDF durability**: generate a report, restart the API pod, download via `/api/pdf/:pdfId` — bytes must come from Firebase Storage.
6. **Notification fail-closed**: remove SMTP env from one instance; enqueue notification; verify job dead-letters as `PROVIDER_NOT_CONFIGURED`, never SENT.
7. **Share-link durability**: create a public share link, restart all API pods, resolve `/report/share/:token` — must load from `reportShares` collection.

### 2. Run Automated Test Suite
```bash
npx tsx tests/run-tests.ts
```

### 3. Run Typecheck & Lint
```bash
npx tsc --noEmit
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm start
```
