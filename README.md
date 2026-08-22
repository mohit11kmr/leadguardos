# LeadGuard OS — Website Revenue & Conversion Diagnostic Engine

LeadGuard OS is an enterprise diagnostic and funnel security platform that audits websites for revenue leakage, broken communication routes (e.g. WhatsApp double country code errors `+9191`), missing ad attribution pixels, robots indexing traps, and transport security defects.

---

## 🚀 Key Capabilities

1. **4-Pillar Diagnostic Engine**:
   - **Lead Guardian (35%)**: Validates WhatsApp routing, phone click-to-call formats, form action tags, and mobile CTAs.
   - **Ad Spend Protection (30%)**: Detects Meta Pixel, Google Tag Manager, Google Analytics 4, and TikTok Pixel attribution scripts.
   - **SEO & Discoverability (20%)**: Flags active `noindex` / `nofollow` tags, canonical status, and mobile viewport compliance.
   - **Cyber & SSL (15%)**: Checks HTTPS enforcement, mixed-content security, and header hygiene.

2. **24/7 Watchdog Heartbeat & Monitoring**:
   - Distributed worker lease locking (`acquireTargetLease` / `releaseTargetLease`) to eliminate probe collisions across multi-instance containers.
   - SHA-256 finding fingerprinting with automated 6-hour incident deduplication.

3. **Enterprise Security & Data Isolation**:
   - Multi-layer SSRF filter blocking IPv4 private subnets (RFC 1918), loopbacks, link-local, IPv6 unique local, and AWS/GCP cloud metadata (`169.254.169.254`).
   - Role-Based Access Control (RBAC) with secure Firestore user profile syncing.
   - Secret masking on webhook and API listings (`********`).
   - Public scan token isolation (`/report/:token`) with strict owner-only ID access.

4. **Multi-Provider Monetization & Webhooks**:
   - Webhook integrations for Razorpay (HMAC-SHA256 signature verification), Stripe, and Cashfree.
   - Guarded order state transitions preventing unverified status mutation.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` and configure credentials:

```env
# Server & Runtime
NODE_ENV=production
STORAGE_MODE=firestore

# AI Diagnostics
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin SDK (Cloud Firestore)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Payment Gateways (Optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

---

## 🧪 Testing & Verification

Run the automated test suite covering SSRF defense, regex accuracy, scoring models, feature registry, and distributed locking:

```bash
# Run all automated tests
npm test

# Run type check and lint
npm run lint

# Compile production bundle
npm run build
```

---

## 📦 Production Deployment

The project builds a dual-target production artifact:
- Client SPA static assets output to `dist/`
- Express API server bundled to `dist/server.cjs` via `esbuild`

Start the production server:
```bash
npm run build
npm start
```
