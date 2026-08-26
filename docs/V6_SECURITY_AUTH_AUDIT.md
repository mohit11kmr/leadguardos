# V6 Security & Authentication Audit

## Authentication flow

The repository currently supports several identity models:

1. PostgreSQL-backed JWT auth via authService.ts.
2. Legacy hand-rolled JWT verifier in middleware/auth.ts.
3. Firebase ID token verification for transitional compatibility.
4. API key authentication for developer API and admin-style requests.

The effective flow is:

- User logs in using email/password.
- server/auth/authService.ts creates a short-lived access token and a rotating refresh token.
- Middleware verifies access tokens, then falls back to legacy token verification, then Firebase tokens, and finally API keys.

This is an intentionally transitional architecture, but it creates ambiguity about the true trust boundary.

## Authorization flow

Authorization is enforced by:
- requireAuth: validates bearer token or X-API-Key
- optionalAuth: attaches user if present without blocking
- requireRole: gated by role

Role types present:
- USER
- AGENCY
- ADMIN

Access checks are common in routes and repositories, but policy boundaries are not always enforced consistently at the repository layer.

## Privilege boundaries

The important privilege boundaries today are:
- user can access their own scans and schedules
- admin can access any scan or watchdog
- API key users can access developer routes and own resources
- Firebase admin UIDs can elevate to ADMIN role

This is workable but not clearly owned in one place.

## Potential weaknesses

### 1. Multi-auth model complexity
The app accepts several token types and tries them in sequence. This makes it harder to reason about risk and policy.

### 2. Mixed static and dynamic config
Firebase identity and JWT secrets rely on environment variables plus legacy config files; some logic falls back to config files in development.

### 3. API key trust assumptions
X-API-Key is accepted directly and treated as a valid identity. This is acceptable for service-to-service use, but it is not isolated from user-API policy.

### 4. Frontend trust assumptions
The frontend attaches Firebase tokens when available and uses fetch wrappers that will send Authorization if a Firebase user is signed in. This means the client can include an identity token without an app-level gate or explicit user model decision.

### 5. Legacy token compatibility
The app still supports legacy self-signed JWT tokens, which is a sign that old clients may still be valid. That creates compatibility risk and weakens authentication hygiene.

### 6. Admin role derivation risk
Admin identity can be implied by Firebase UID list or env values. This is a real privilege escalation path if environment configuration is weak or mis-specified.

## Frontend trust assumptions

The frontend uses Firebase auth for a client-side identity model while the backend accepts multiple identity sources. The frontend is not a secure judge of authority; it must only be treated as a presentation layer. The current implementation does not fully separate these concerns.

## Backend trust assumptions

The backend assumes that:
- request headers are trustworthy enough to identify the actor,
- API keys and tokens are properly scoped,
- no domain is allowed to request protected data beyond user ownership checks,
- the database contains the correct user and role mapping,
- rate limiting is enough to prevent abuse.

These assumptions are reasonable but not yet centrally enforced across every route.

## Recommended V6 auth model

The V6 target should use a single first-class auth model:
- short-lived JWT access tokens for browser sessions,
- rotating refresh tokens with family-based revocation,
- service accounts for developer API access,
- explicit permission policy map rather than broad role-switching fallback logic.

Do not keep Firebase auth as a concurrent source of truth. It should be removed or isolated behind a single compatibility adapter if it remains temporarily.

## Security note

This module is a transitional compatibility layer, not a clean final security model. The principle is correct but the implementation is still pluralistic.
