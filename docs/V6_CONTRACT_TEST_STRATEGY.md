# V6 Contract Test Strategy

Phase 3A tests the existing V5 runtime through additive tests. They do not rewrite routes or require the new packages to be imported by production code.

## Layers

- Schema tests: valid/invalid audit, actor, report, billing, webhook, and job payloads.
- Scanner compatibility: deterministic fixture outputs from existing `SAMPLE_PRESETS` and repository sample data; normalize dynamic IDs/timestamps/timings only.
- API compatibility: HTTP tests against the current server where environment and database allow; otherwise route/shape fixtures cover the contract until a test server harness is available.
- Public report: token and scan-ID projection tests preserve sanitized fields and ownership behavior.
- Payment: pure existing signature/state-machine tests with fake provider payloads; never call live Razorpay.
- Boundary: deterministic import-path scan for forbidden dependency strings; no AST/compiler plugin required.

## Required Assertions

Every compatibility test records method/path, status expectation, required response keys, error code shape, and ownership/privacy expectation. Tests must distinguish an existing V5 response from the future canonical envelope; no test should force current routes to change envelopes in Phase 3A.

## Dynamic Data Normalization

Ignore scan IDs, public tokens, timestamps, random IDs, and network timing only where the existing runtime generates them dynamically. Do not normalize score, finding category/severity/title, URL, payment amount, signature validity, or public/private field presence.

## Fixtures

`tests/contracts/scanner/` contains source-backed representative inputs/results. `tests/contracts/payment/` contains non-secret provider event fixtures. `tests/contracts/public-reports/` contains shape/authorization cases without real production tokens.

## Execution

Run the standalone contract suite with `npx tsx tests/contracts/run-contract-tests.ts`, then run `npm run lint`, `npm test`, `npm run build`, and environment-dependent PostgreSQL/emulator suites when configured. A failing legacy test is reported separately; it is not fixed by changing production behavior in Phase 3A.
