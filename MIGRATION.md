# LeadGuard OS — Firebase/Firestore → PostgreSQL Migration

Status: **PHASE 1 COMPLETE** — PostgreSQL is the production source of truth.

Verified gates: typecheck ✅ · legacy suite 190/190 ✅ · PG suite 34/34 on live PostgreSQL ✅ · build ✅

Remaining tracked items (non-blocking for Phase 1): frontend Google sign-in still uses the Firebase SDK; legacy Firestore branches remain in repositories as dead dev-only fallback code pending cleanup.

## Architecture

```
React + Vite → Express/TypeScript → Service Layer → Repository Layer
                                                     ↓
                              Prisma ORM → PostgreSQL (single source of truth)
```

- Production requires `DATABASE_URL` — the app fails fast without it. No silent JSON fallback.
- Local JSON storage (`server/storage.ts`) remains ONLY as a marked dev/test adapter.
- Redis is optional; PostgreSQL-backed rate counters (`RateLimitWindow`) already provide shared multi-instance limiting.

## Completed & Verified

| Phase | Item | Verification |
|---|---|---|
| 2 | Prisma 6 + PostgreSQL 16 schema (24 tables) | `prisma migrate dev` applied to live DB |
| 4 | App-owned auth: register/login/JWT(15m)/refresh rotation(7d)+family reuse detection/bcrypt(12) | `npm run test:pg` — real DB |
| 5 | Durable API keys (hash-only storage, restart survival, revocation) | `test:pg` cache-wipe test |
| 7 | Real Stripe signature verification (t/v1 scheme, tolerance) + Cashfree HMAC verification | `test:pg` crypto vectors |
| 11 | Security headers middleware (CSP/HSTS/nosniff/frame/referrer/permissions) | wired in server.ts |
| 23 | Firestore→PG import script (dry-run, idempotent upserts) | `npm run migrate:firestore:dry-run` |

## Auth endpoints (`/api/v1/auth`)
`POST /register · /login · /refresh · /logout · /logout-all · GET /me`

Access JWT claims contain only `sub/email/role`. Refresh tokens are opaque
48-byte secrets; DB stores SHA-256 hashes only. Replaying a rotated token
revokes its entire family (theft detection).

## Legacy compatibility
- Old hand-rolled JWTs and Firebase ID tokens are still accepted by
  `requireAuth` during transition (documented in middleware). New clients use `/api/v1/auth/*`.
- Frontend Firebase SDK remains for Google sign-in popup; email/password users authenticate via the API.

## Remaining work (tracked)
1. PG-backed implementations for remaining repository read paths (scan/watchdog listing currently dual-mode Firestore/local)
2. Queue adapter swap: `FirestoreQueueAdapter` → Prisma `JobExecution` (schema ready)
3. server.ts decomposition into routes/controllers modules
4. Docker compose with Postgres service + CI Postgres job
5. Rate limiter PG branch wiring (schema ready, Redis optional)

## Commands
```bash
# local database
sudo service postgresql start
createdb via psql → set DATABASE_URL in .env

npx prisma migrate dev      # apply schema changes
npm run db:generate         # regenerate client after schema edits
npm run migrate:deploy      # production migrations
npm run test:pg             # migration verification suite (real DB)
npm run migrate:firestore:dry-run   # inspect legacy data
npm run migrate:firestore           # idempotent import (never deletes Firestore)
```

## Security notes
- Passwords: bcrypt cost 12; plaintext never stored or logged.
- API keys: raw shown once at creation; DB stores SHA-256 + prefix only.
- Payment webhooks: Stripe `t=...,v1=...` timing-safe verification with 5-min tolerance; Cashfree base64-HMAC(raw body); Razorpay order|payment HMAC unchanged.
- No secrets in JWTs; no client-trusted amounts anywhere.
