# LeadGuard OS V6 Worker Architecture

## Target Structure

```text
apps/worker/src/
  worker.ts              bootstrap, signal handling, polling/claim loop
  jobs/
    audit/               scanWebsite, scanBatch
    monitoring/          runWatchdog, scheduleDueTargets
    reports/              generatePdf, exportReport
    ai/                   aiAnalysis
    notifications/        sendNotification
    webhooks/             sendWebhook
  queue/                  adapter, claim, lease, depth
  executors/             type-specific execution only
  retry/                 backoff, classification, max attempts
  recovery/              expired leases, dead letters, replay/reconciliation
```

The current seven job types are preserved as compatibility names: `scanWebsite`, `scanBatch`, `runWatchdog`, `sendWebhook`, `sendNotification`, `generatePdf`, and `aiAnalysis`.

## What Leaves the API Process

- Long or runtime website scans and batch scans.
- AI remediation and validation/persistence.
- PDF rendering, object upload, integrity metadata.
- Watchdog probes, incident state evaluation, and recurring scheduling.
- Notification and signed webhook delivery.
- Retry, lease recovery, dead-letter inspection, and provider reconciliation.

The API can enqueue these jobs and return status; it must not duplicate execution logic.

## Job Contract Matrix

| Job | Producer | Queue | Input | Output | Retry | Idempotency |
|---|---|---|---|---|---|---|
| `scanWebsite` | Audit API, Monitoring | audit | `jobId`, `url`, `options`, actor/org | `scanId`, status, score, findings reference | URL/provider timeout retry 3; invalid URL no retry | `scan:{normalizedUrl}:{requestKey}` |
| `scanBatch` | Agency/Audit API | audit | batch ID, max 50 URLs, options, actor/org | per-URL results and batch status | per item bounded concurrency; invalid items permanent | `batch:{batchId}` |
| `runWatchdog` | Monitoring scheduler | monitoring | `targetId`, exact target URL, scheduled time | check log, score/status, next run | transient probe retry; preserve target state | `watchdog:{targetId}:{window}` |
| `aiAnalysis` | Audit completion | ai | `scanId`, approved findings, prompt version | validated `AiReport` hashes/status | provider timeout retry 2; invalid output dead-letter | `ai:{scanId}:{inputHash}:{promptVersion}` |
| `generatePdf` | Reports API | reports | `scanId`, report version, actor | `PdfReport` metadata and object path | storage/provider retry 3 | `pdf:{scanId}:{reportVersion}` |
| `sendWebhook` | Monitoring/Developer | delivery | webhook ID, event ID, payload hash, signed payload | delivery record/status | exponential backoff; dead-letter after 5 | `webhook:{webhookId}:{eventId}` |
| `sendNotification` | Monitoring | delivery | provider, recipient, event, body, delivery key | notification delivery record | provider-specific backoff; missing credentials permanent | existing delivery key hash |

## Execution Invariants

- Claiming is atomic (`FOR UPDATE SKIP LOCKED` in PostgreSQL) and leases expire for crash recovery.
- Every executor validates its payload before side effects and persists a terminal result before reporting success.
- Retry classification distinguishes transient network/provider/database errors from invalid input, unauthorized ownership, invalid AI output, and missing configuration.
- Attempts are bounded; exhausted jobs become `DEAD_LETTER` with reason, payload digest, and correlation ID. Sensitive payload values are redacted from logs.
- A dead-letter replay creates a new attempt under an operator command and never mutates the original history.
- Worker identity, lease owner, attempt, next-attempt time, recovery count, and last error are durable.
- Worker never trusts browser-provided user IDs, prices, scan scores, or provider status.

## Worker Startup and Shutdown

`worker.ts` loads validated environment, constructs queue/domain dependencies, starts claim loops per queue class, renews leases, and handles SIGTERM by stopping claims, allowing bounded in-flight completion, releasing/expiring leases, closing providers, and exiting non-zero if shutdown is not clean. No Vite or UI startup occurs.
