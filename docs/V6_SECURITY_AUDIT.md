# V6 Security Audit

## Executive summary

The codebase contains an above-average set of security controls for a product of this complexity, but the overall trust model is weakened by legacy compatibility layers and multiple authentication schemes. Most high-impact risks are architectural and policy-related rather than simple vulnerability classes.

## Findings

| ID | Severity | Area | Finding | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | HIGH | SSRF / HTTP validation | URL validation and DNS resolution are enforced before scanning | server/ssrfGuard.ts validates hostnames, private IP ranges, and DNS lookup results | Medium-high risk of unsafe outbound requests is reduced by explicit blocking | Keep and expand to a shared scanner validation library in V6 |
| SEC-002 | HIGH | Auth | Multiple identity systems are accepted in one middleware chain | server/middleware/auth.ts accepts JWT, legacy JWT, Firebase tokens, and API keys in sequence | High complexity and mis-trust risk; unclear canonical identity | Consolidate to one auth source and one API-key policy in V6 |
| SEC-003 | HIGH | Secrets / config | Production secret requirements exist but migration state is not centralized | server/config/envValidator.ts, server/auth/authService.ts, server/security/firebaseAuth.ts | Medium-high risk of misconfigured production deployments | Enforce one secret manifest and fail-fast config validation |
| SEC-004 | MEDIUM | Payment verification | Razorpay and webhook signature checks are implemented | server/services/paymentService.ts | Lower risk if secret plumbing is correct | Centralize payment verification and idempotency at the gateway boundary |
| SEC-005 | MEDIUM | Headers | Security headers are set globally | server/security/securityHeaders.ts | Good baseline defense | Keep but make this a strict shared middleware package |
| SEC-006 | MEDIUM | Rate limiting | IP-based rate limiting is active | server.ts has in-memory rate limiter | Best-effort only; not safe for multi-instance production | Replace with distributed token bucket or database-backed limiter in V6 |
| SEC-007 | MEDIUM | Logging | Sensitive content is redacted in logger output | server/observability/logger.ts | Good practice exists | Continue to centralize and enforce redaction |
| SEC-008 | MEDIUM | Report sharing | Public report tokens are durable and protected by expiration | server/reports/reportManager.ts | Risk is manageable if token usage is constrained | Preserve report-token model but standardize access/revocation |
| SEC-009 | LOW | CORS | Not clearly centralised in app code | Express setup appears to rely on default behavior | Potentially low unless cross-origin API clients are expected | Explicitly define CORS policy in V6 |
| SEC-010 | INFO | Frontend | Firebase config is embedded in client app and used for auth | src/lib/firebase.ts and firebase-applet-config.json | Low-to-medium risk if project keys are exposed | Remove client-side app auth from production trust model |
| SEC-011 | HIGH | Legacy compatibility | Firebase auth remains accepted for production flow | server/security/firebaseAuth.ts and server/middleware/auth.ts | High operational and security confusion | Remove or isolate in a compatibility adapter |
| SEC-012 | MEDIUM | API abuse | Multiple endpoints accept unbounded user input without schema-level checking in some paths | server.ts and some routes | Risk of malformed data and abuse | Add centralized validation and policy enforcement |

## Classification summary

- CRITICAL: none explicitly found in the repository evidence reviewed, but the mixed auth model is a major risk area.
- HIGH: auth complexity, legacy token/Firebase overlap, SSRF blocking needs consistent enforcement across all outbound requests
- MEDIUM: rate limiting, payment verification policy, logs, webhook trust boundaries
- LOW: frontend config exposure, CORS exposure, minor trust assumptions
- INFO: transitional compatibility and config drift

## Overall assessment

The project shows a credible amount of security engineering for a product with a scanner and payments layer. However, the biggest security problem is not a single bug; it is the current coexistence of multiple identity and trust systems. That problem is architecturally expensive and should be treated as a core V6 risk.
