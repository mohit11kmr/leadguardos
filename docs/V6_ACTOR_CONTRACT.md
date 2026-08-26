# V6 Actor Contract

Phase 3A defines the shared identity context only. Current authentication behavior remains unchanged.

## Contract

```ts
interface ActorContext {
  actorId?: string;
  email?: string;
  role?: 'USER' | 'AGENCY' | 'ADMIN';
  organizationId?: string;
  sessionId?: string;
  authSource: 'app-jwt' | 'legacy-jwt' | 'firebase' | 'api-key' | 'anonymous';
  requestId?: string;
}
```

## Field Rules

- `actorId` is the server-resolved subject, never a client-supplied ownership claim.
- `role` is a coarse authorization input; domain policy and ownership checks remain server-side.
- `organizationId` is optional until Agency membership is modeled explicitly.
- `sessionId` is optional and must not contain a raw refresh token.
- `authSource` records provenance for migration telemetry and is not by itself permission.
- `requestId` correlates API logs, jobs, provider calls, and audit events.

Anonymous requests may have no actor ID and use `authSource: anonymous`. API-key requests resolve to the key owner with `authSource: api-key`; they do not become admins. Firebase/legacy values may populate this contract only through compatibility adapters during migration.

## Boundary Rule

Web may display actor information but cannot assign role, ownership, entitlement, or organization membership. API middleware constructs the context. Worker jobs carry the minimum actor/org identifiers required for authorization and audit logging; they re-check durable ownership before side effects.
