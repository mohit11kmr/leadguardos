# V6 Environment Contract

The non-secret manifest lives in `packages/config/src/environment.ts`. It describes current variable names and ownership without loading or exposing values. Existing runtime validators remain unchanged in Phase 3A.

## Web

`VITE_API_URL` and `VITE_APP_URL` are browser-safe origins/defaults. Only `VITE_*` values may be bundled into the web app; no JWT, payment, database, Firebase Admin, SMTP, or provider secret may cross this boundary.

## API

`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CORS_ORIGINS`, `STORAGE_MODE`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and optional `REDIS_URL` belong to API/runtime infrastructure. Current app also reads `GEMINI_API_KEY` and AI settings; these remain server-side until worker separation.

## Worker

`DATABASE_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_REMEDIATION_MODEL`, `AI_REMEDIATION_TIMEOUT_MS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `TELEGRAM_BOT_TOKEN`, and `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` belong to worker/provider execution. Queue configuration will be added in the worker migration, not renamed now.

## Compatibility Rules

- Do not rename variables during Phase 3A.
- Secret values never enter shared packages, fixtures, logs, client bundles, or job payloads.
- Production requires PostgreSQL and rejects local storage mode according to current validators.
- Environment validation remains fail-fast for production-required secrets; optional AI/notification providers report unavailable status rather than fake success.
- Each future app receives only the variables it needs; staging and production use separate credentials and origins.
