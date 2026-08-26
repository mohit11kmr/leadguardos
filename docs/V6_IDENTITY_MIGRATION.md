# LeadGuard OS V6 Identity Migration

## Canonical Identity

PostgreSQL-backed application identity is canonical. The browser receives a short-lived HS256 JWT access token (15 minutes today; target remains <=15 minutes) and an opaque rotating refresh token. Refresh tokens are hashed, family-scoped, revocable, and never returned in logs. The API resolves every request to one `ActorContext`:

```ts
{ subjectId, email, role, organizationIds, permissions, authMethod, sessionId, requestId }
```

Roles are coarse labels (`USER`, `AGENCY`, `ADMIN`); permissions and resource ownership enforce actual authority. Agency membership is an organization relationship, not a role shortcut. Admin is an explicit database role with audited policy checks. Developer access uses service/API keys with scopes and a user/org owner, never an admin impersonation.

## Identity Objects

| Object | Owner | Rules |
|---|---|---|
| Access token | Identity | signed, short-lived, minimal claims; never authority without DB policy where sensitive |
| Refresh token | Identity | opaque, SHA-256 at rest, family rotation and reuse revocation |
| Session | Identity | represented by refresh family/device metadata; revoke one or all |
| User | Identity | canonical profile, active state, email uniqueness |
| Role | Identity/Admin | USER/AGENCY/ADMIN; role changes audited and server-only |
| Agency role | Agency + Identity | organization membership and permission set; no global role inference |
| Admin role | Identity/Admin | explicit role assignment, no Firebase UID/environment elevation |
| Developer/API key | Developer | hashed, scoped, expirable/revocable, owner-bound |
| Entitlement | Billing | feature grant with source, expiry, and user/org subject |
| Ownership | Owning domain | every scan/monitor/order/report checks actor subject or organization membership |

## Legacy Mechanisms

| Mechanism | Phase 3 action | Retirement condition |
|---|---|---|
| `server/auth/authService.ts` JWT + refresh | keep and make canonical behind Identity service | none; becomes V6 implementation |
| `server/middleware/auth.ts` legacy verifier | isolate as compatibility adapter; no new call sites | all old routes use canonical actor context |
| Firebase ID tokens / `server/security/firebaseAuth.ts` | accept only on an explicitly named migration endpoint; resolve to existing Postgres user; emit deprecation telemetry | migration window and client cutover complete, then reject |
| Firebase UID/admin env elevation | remove from authorization decisions; support audited one-time migration mapping only | no production dependence |
| `X-API-Key` | keep for developer integration, move to scoped service-account policy | never remove while supported external clients exist |
| local in-memory token/users | test-only; never production authority | always absent in production |

## Transition Sequence

1. Introduce `ActorContext` and canonical policy resolver without changing external routes.
2. Make all routes call the resolver; legacy JWT/Firebase adapters return the same context and are logged as legacy.
3. Migrate browser login/refresh to `/api/v1/auth` and remove Firebase token attachment from new client code.
4. Backfill/link Firebase identities to Postgres users by verified UID/email with collision review; do not auto-elevate roles.
5. Rotate sessions after cutover; revoke legacy families and publish a deprecation date.
6. Convert API keys to explicit scopes and service-account audit events.
7. Delete legacy verifier and Firebase production acceptance only after telemetry and compatibility tests show zero use.

## Security Requirements

Refresh endpoints are rate-limited and use secure transport. Password registration/login uses strict schemas and uniform failure messages. Every role/ownership decision is server-side. Access tokens are never accepted as refresh tokens. Key material and provider secrets remain server-only. Account deletion/export is an Identity orchestration that calls domain-owned data export/deletion policies.
