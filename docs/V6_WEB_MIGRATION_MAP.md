# LeadGuard OS V6 Web Migration Map

## Migrated source ownership

| Current path | Target path | Type | Notes |
| --- | --- | --- | --- |
| `src/main.tsx` | `apps/web/src/main.tsx` | React entrypoint | Provider order preserved |
| `src/App.tsx` | `apps/web/src/App.tsx` | Application shell | Existing state, routes, callbacks preserved |
| `src/components/**` | `apps/web/src/components/**` | Browser components | Copied without redesign |
| `src/context/**` | `apps/web/src/context/**` | Browser providers | Firebase/theme/language behavior preserved |
| `src/config/**` | `apps/web/src/config/**` | Web configuration | No server secrets present |
| `src/data/**` | `apps/web/src/data/**` | Browser fixtures | Existing feature data preserved |
| `src/lib/**` | `apps/web/src/lib/**` | Browser adapters | `apiFetch` delegates to the new web API client |
| `src/services/**` | `apps/web/src/services/**` | Browser services | Broken-link probe uses browser `fetch` and abort timeout |
| `src/utils/**` | `apps/web/src/utils/**` | Browser utilities | PDF, billing UI, and revenue behavior preserved |
| `src/types.ts` | `apps/web/src/types.ts` | Web-only types | Shared contracts remain in `packages/types` |
| `src/index.css` | `apps/web/src/index.css` | V5 styling | Copied unchanged |
| `firebase-applet-config.json` | `apps/web/firebase-applet-config.json` | Browser config | Firebase browser config; no server credentials |

## API compatibility

`apps/web` continues to call the existing V5 compatibility endpoints such as `/api/scan`, `/api/config`, `/api/scans/history`, and `/api/report/*`. No endpoint was renamed to `/api/v1/*`. `apps/web/src/api/client.ts` owns the configurable `VITE_API_URL`, request IDs, Firebase bearer transport, and abort timeout; existing response semantics remain unchanged.

## Intentionally not migrated

- `server.ts`, `server/**`, `worker.ts`, and backend services
- `prisma/**`, repositories, storage, and database access
- scanner execution and detector implementations
- backend authentication, Firebase Admin, payment verification, and queue behavior
- root `src/**` compatibility copy, retained until live equivalence is proven

## Verification status

- `apps/web` builds independently and starts with Vite on port `5173`
- root V5 lint, tests, and build pass
- contract suite remains 20/20
- boundary checker passes with no web-to-server/database imports
- Live scan, auth, report, monitoring, agency, and billing flows still require a configured V5 API/runtime verification pass before retiring root `src/`
