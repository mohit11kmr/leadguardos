# LeadGuard OS V6 Phase 3C Web Migration

## Checkpoint status

The real V5 browser application is now owned by `apps/web/src` as a verified build target. The root `src/` copy remains intentionally present as the compatibility fallback while live backend-dependent flows are verified.

## What moved

All 78 files under the V5 `src/` tree were copied into `apps/web/src`, including `App.tsx`, all product components, providers, configuration, browser services, utilities, types, and the original CSS. The Vite entrypoint and HTML metadata were moved to the independent web application. The Firebase browser configuration was copied beside the web source.

The browser API adapter is now available at `apps/web/src/api/client.ts`; `lib/api.ts` delegates to it. Existing callers keep the same V5 paths and response handling. Simple raw calls were switched to the client without changing endpoint semantics.

## What did not move

Backend routes, `server.ts`, worker code, scanner execution, Prisma, repositories, storage, backend auth, payment verification, and queue behavior remain untouched. The root `src/` tree is retained until live equivalence gates pass.

## Environment and entrypoint

- Web dev server: `5173`
- Existing V5 API: current root runtime and its existing port
- Browser variables: `VITE_API_URL` and `VITE_APP_URL`
- No secrets are included in web configuration

Run the new frontend with:

```bash
npm run dev:web
npm run build:web
```

## Verification

- `npm run lint` — passed
- `npm test` — passed
- `npm run build` — passed
- `npm run build:web` — passed
- Phase 3A contract tests — 20 passed, 0 failed
- V6 boundary checker — passed
- `apps/web` startup — verified on `http://localhost:5173`

## Remaining gates

Live scan, authentication, public reports, monitoring, agency, and billing flows require the current V5 API plus configured runtime services. Those flows are not claimed as verified here. Root V5 remains runnable, and no Phase 3D/backend migration has started.
