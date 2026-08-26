# V6 Contract Compatibility Tests

Run with:

```bash
npx tsx tests/contracts/run-contract-tests.ts
```

The suite validates additive schemas, current scanner/preset facts, public report sanitization, payment signature guards, and job contracts. Set `V6_CONTRACT_TEST_URL` to a running current V5 server to execute live checks for `/api/health`, `/api/config`, `/api/features`, and `/api/scans/history`.

Fixtures are source-backed and intentionally retain dynamic values only where the existing runtime defines them. No live payment provider is contacted.
