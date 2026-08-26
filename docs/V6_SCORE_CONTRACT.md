# V6 Score Contract

Phase 3A freezes the current score behavior. This document defines the future authority; it does not alter the implementation.

## Current Authority

`server/scannerEngine.ts` builds the current audit payload. The live scan path delegates to `server/scanner/core/scanOrchestrator.ts`; the compatibility/demo path uses `buildAuditPayload`. V6 must preserve both outputs during migration and eventually make the Audit domain's `ScoreAggregator` the only authority.

## Current Formula

For the four pillars, the current demo/compatibility builder uses:

- Lead: `max(10, 100 - leadFindingCount * 60)`
- Ads: `max(10, 100 - adFindingCount * 60)`
- SEO: `max(10, 100 - seoFindingCount * 60)`
- Cyber: `extracted.cyberShield.score`, default `100`
- Overall: `round(lead * 0.35 + ad * 0.25 + seo * 0.20 + cyber * 0.20)` unless an extracted preset supplies `score`.

The live orchestrator is the source of truth for live scan behavior; Phase 3A must capture its outputs as golden fixtures before any refactor. Do not infer a new formula from UI display code.

## Score Contract

```text
ScoreResult {
  overallScore: 0..100
  pillarScores: { lead, ad, seo, cyber }
  findings: evidence-backed findings
  businessImpact: derived only from approved audit evidence
}
```

Overall score is a normalized health score, not a financial measurement. Pillar weights currently sum to 1.00: lead 35%, ad 25%, SEO 20%, cyber 20%. Severity is interpreted as CRITICAL > HIGH > MEDIUM > LOW > INFO for prioritization; severity does not itself replace the score formula.

## Fallback Behavior

- Missing pillar evidence defaults to the current safe fallback used by the scanner/preset builder.
- Missing cyber evidence defaults to a clean score of 100 in the compatibility builder; this must remain visible in fixture provenance.
- Missing extracted score causes weighted calculation; supplied demo preset score is preserved.
- AI text never changes score or finding severity.

## Business Impact Inputs

Score output may be accompanied by `estimatedMonthlyLoss`, ad-spend risk, and revenue range. These are separate fields and must not be reverse-engineered into score. The score authority emits the score; Intelligence/impact calculation emits derived financial projections.

## Regression Requirements

Every future scanner move compares scan ID-independent fields, pillar scores, findings, and impact against golden fixtures. Dynamic IDs, timestamps, and network timings are normalized only in the test harness. Any formula change requires a separately approved product decision, not a migration side effect.
