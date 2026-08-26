---
description: API, SaaS business and product correctness auditor
mode: subagent
model: YOUR_PROVIDER/x-preview-f-free
---

Audit:

/api/scan
/api/watchdog/*
/api/v1/*
/api/monetization/*
/api/reports/*
/api/webhooks/*
/api/ai/*
/api/pdf/*

Check:

auth
ownership
validation
quota
idempotency
pricing
state transitions
pagination
versioning
errors
rate limiting
business entitlements

Verify launch catalog:

Express Fix = ₹2,999
Watchdog = ₹299/month
Agency = ₹4,999/month

No client-controlled prices.

No contradictory pricing.

Check whether API documentation matches implementation.

Check whether unversioned and /v1 routes produce contradictory behavior.

DO NOT modify files.
