# V6 Boundary Rules

These rules are documented in Phase 3A. Enforcement is provided by `scripts/check-v6-boundaries.ts` as a lightweight deterministic check; no production imports are changed yet.

## Forbidden Dependencies

- Web (`src/` now, `apps/web/` later) cannot import `server/`, Prisma, repositories, Node-only secrets, or Firebase Admin.
- Shared packages (`packages/types`, `packages/schemas`, `packages/config`, `packages/security`) cannot import React, Express, Prisma, or application `server/` modules.
- Worker (`worker.ts`, `server/queue/`, future `apps/worker/`) cannot import React, Vite, or browser-only modules.
- API route handlers cannot contain scanner algorithms, payment state transitions, or repository implementation details.

## Allowed Direction

Web -> API contracts; API -> domain services/repositories; worker -> domain execution contracts; all applications -> platform-neutral types/schemas; domain-to-domain communication through contracts/events, not foreign table writes.

## Current Compatibility Exception

Current V5 paths intentionally violate future placement because migration has not started. The checker scans only the new package tree and future `apps/` directories when present; it does not fail the existing monolith merely for existing legacy imports.
