# V6 Technical Debt

## Critical

1. Mixed identity system: JWT, legacy JWT, Firebase tokens, and API keys are all accepted in the same request pipeline.
2. Mixed persistence model: local JSON/dev storage, Firestore references, and PostgreSQL coexist without a single canonical datastore.
3. Mixed product surfaces in one app shell: audit, monitoring, agency, dev portal, admin, marketing, and reports are all connected at the same UI layer.
4. Overlapping feature ownership: multiple domains define or consume lead/scan/watchdog/payment data without a single authoritative domain map.
5. Unclear schema ownership: the Prisma schema shows a strong direction, but legacy storage models and compatibility adapters still compete with it.

## High

6. Large frontend abstraction problem: App.tsx becomes a single orchestrator with modals, multiple tabs, and enterprise product state in one component.
7. Route duplication and policy drift: scan and watchdog APIs appear in both public and developer routes with inconsistent auth and formats.
8. Legacy compatibility and deprecation logic: Firebase auth and old token flows remain active rather than being fully retired.
9. Unclear business logic placement: scoring, pricing, entitlement, and scanner output are spread across UI, api, service, and repo folders.
10. Test and runtime complexity mismatch: tests exist but the repo architecture and migration story are more complex than what the product experience reflects.

## Medium

11. Monitoring and schedule layering is duplicated: scheduling logic exists in storage, scheduler, queue, and repository objects.
12. Payment logic is product-spanning: pricing, checkout, verification, order records, and fulfillment are all intersecting responsibilities.
13. AI output is injected at inconsistent points: AI is used in the server scan route and worker queue with different fallback logic and no single place of policy.
14. Reporting logic is partially durable but not always centrally owned; share/report work crosses user storage and DB storage.
15. Documentation drift: the repository contains important design docs that no longer line up with the actual codebase.

## Low

16. UI micro-feature sprawl: reviews, theme, language, blog, similar utilities add scope without domain cohesion.
17. Visual system inconsistency: many tabs and components imply a multi-iteration product style, but the design system is not centralized.
18. Some local-only helper functions and mock data patterns appear in production-facing code, especially in marketing/demo flows.

## Summary

The most valuable technical debt cleanup in V6 is not cosmetic; it is ownership cleanup. The product needs a single source of truth for identity, datastore, routing, and domain logic.
