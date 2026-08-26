# LeadGuard OS V6 Target Architecture

Status: Phase 2 blueprint only. No production source is moved by this document.

## Decision Summary

V6 is a modular monolith split into three deployable applications and four dependency-controlled packages. PostgreSQL is the canonical data authority. The browser talks to the API through typed clients; the API owns policy and short request/response work; the worker owns durable asynchronous execution. Agency, Developer, and Admin remain product domains in the same deployment, not microservices.

```text
Browser -> apps/web -> apps/api -> PostgreSQL
                         |             |
                         v             v
                    apps/worker <- JobExecution
                         |
             external providers / object storage
```

## Repository Shape

```text
leadguardos/
  apps/
    web/                 React/Vite browser application
    api/                 Express HTTP application
    worker/              queue consumer and job executors
  packages/
    types/               compile-time contracts only
    schemas/             Zod/runtime validation and envelopes
    config/              non-secret shared configuration
    security/            shared security primitives and policy helpers
  prisma/                canonical schema, migrations, generated client ownership
  docs/                  architecture, operations, migration, API contracts
  scripts/               migration and maintenance tooling
  .github/               CI/CD and repository automation
```

## Boundary Rules

- `apps/web` may import `packages/types`, `packages/schemas`, and browser-safe config. It never imports Prisma, repositories, secrets, or server services.
- `apps/api` may import all shared packages and owns HTTP policy, repositories, and domain application services. Route handlers do not contain detector, payment, or persistence rules.
- `apps/worker` may import domain application services and shared packages, but has no React/Vite dependency and no HTTP response responsibility.
- `packages/types` has no runtime imports. `packages/schemas` validates untrusted input/output. `packages/config` contains defaults and feature metadata, never secrets. `packages/security` contains pure crypto, URL/SSRF, redaction, and policy utilities.
- `prisma/` is accessed through API/worker infrastructure adapters, never by web or shared packages.
- Domain-to-domain communication uses contracts, application services, or events; domains do not import another domain's repositories.

## Runtime Ownership

| Runtime | Owns | Must not own |
|---|---|---|
| Web | routes, layouts, user interaction, view state, API clients | authority, secrets, pricing calculation, ownership checks |
| API | authentication, authorization, validation, synchronous commands/queries, transaction boundaries | long scans, PDF/AI delivery, retry loops, UI state |
| Worker | scan/AI/PDF/watchdog/notification execution, retries, recovery, dead letters | React, browser route decisions, direct client responses |
| PostgreSQL | durable identity, audit, monitoring, billing, reports, job state | ephemeral UI state |
| Object storage | PDF/report bytes | access policy or metadata authority |

## Canonical Request Flow

1. Web validates only presentation constraints and sends a typed request.
2. API authenticates the actor, validates the request, checks ownership/entitlement, and starts a short operation or enqueues a job.
3. Audit application services produce a versioned audit contract from scanner evidence.
4. API/worker persists through domain-owned repositories in PostgreSQL.
5. Worker emits durable completion/failure events; API exposes queryable status.
6. Web renders only API response contracts.

## Non-goals for Phase 2

No application directories, imports, routes, Prisma models, auth behavior, scanner behavior, CSS, or package scripts are changed. Phase 3 must preserve V5 behavior behind compatibility routes until each migration slice is verified.
