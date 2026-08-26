# LeadGuard OS V6 Phase 3B Boundary Scaffold

Phase 3B creates runtime walls beside the existing V5 application. It does not migrate production source code.

## Applications

- `apps/web` is an independent React/Vite boot shell on port `5173`. It exposes only browser-safe `VITE_API_URL` and `VITE_APP_URL`.
- `apps/api` is an independent Express shell on port `3000`. Its `createApp()` owns request IDs, explicit development CORS, JSON parsing, `/health`, 404 handling, and error handling. `server.ts` owns startup and graceful shutdown only.
- `apps/worker` is a no-port process shell. It logs initialization and handles `SIGTERM`/`SIGINT`; it does not register or execute jobs.

## Shared packages

Phase 3A packages remain the contract boundaries:

- `packages/types`: framework-neutral TypeScript types
- `packages/schemas`: runtime boundary validation
- `packages/config`: environment contracts without secrets
- `packages/security`: security interfaces without runtime adapters

The new application shells do not import production runtime code. The root `server.ts`, `worker.ts`, `src/`, and `prisma/` remain canonical V5 locations.

## Root responsibilities

The root package remains the compatibility runtime and orchestration layer. Existing `dev`, `build`, `test`, and `lint` commands remain intact; additive `dev:*` and `build:*` scripts target the new shells.

## Not migrated

No frontend components, API business logic, scanner, authentication, Firebase, storage, payment logic, queue behavior, worker jobs, Prisma models, compatibility routes, or V5 CSS were moved or changed. Phase 3C is the first controlled source migration.
