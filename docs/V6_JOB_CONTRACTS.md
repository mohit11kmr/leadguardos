# V6 Job Contracts

Phase 3A defines target contracts while preserving current queue names and statuses.

## Envelope

Every future job has `jobId`, `jobType`, typed `payload`, `attempt`, `maxAttempts`, `createdAt`, `correlationId`, and `idempotencyKey`. Payloads are validated before enqueue and before execution. Correlation IDs connect the originating request, job, domain event, and provider delivery.

## Job Types

| Target type | Current type | Producer | Required payload | Terminal output |
|---|---|---|---|---|
| `audit` | `scanWebsite`, `scanBatch` | Audit API/Agency | URL or bounded URL list, options, actor context | scan/batch IDs, status, score/result references |
| `watchdog` | `runWatchdog` | Monitoring scheduler | target ID, exact target URL, scheduled time | check log, health/incident state, next check |
| `ai` | `aiAnalysis` | Audit completion | scan ID, approved findings, prompt version | validated AI report with hashes |
| `pdf` | `generatePdf` | Reports API | scan ID, report version, actor | PDF metadata, digest, object path |
| `notification` | `sendNotification` | Monitoring | provider, recipient, body, event, delivery key | delivery status/message ID |
| `webhook_delivery` | `sendWebhook` | Monitoring/Developer | webhook/event IDs, URL, signed payload hash | delivery status/attempt record |

## State Machine

Target states: `PENDING -> RUNNING -> SUCCEEDED`; transient failure: `RUNNING -> RETRYING -> RUNNING`; terminal failure: `RUNNING -> FAILED` or `DEAD_LETTER`; operator cancellation: `PENDING|RETRYING -> CANCELLED`. Current queue uses `QUEUED` and `COMPLETED`; adapters map `QUEUED` to target `PENDING` and `COMPLETED` to `SUCCEEDED` without changing current storage.

`TIMED_OUT` is a current compatibility state and maps to target `FAILED` with timeout reason. A dead letter is a failed job whose retry budget is exhausted or whose error is permanently non-retryable. No job is considered successful until its durable result/side effect is persisted.

## Retry and Idempotency

- Retry transient provider/network/temporary database errors with bounded exponential backoff.
- Do not retry invalid payload, unauthorized resource, unsupported provider, invalid payment proof, or invalid AI output.
- Payment events dedupe by provider plus event ID; webhook delivery by webhook plus event ID; reports by scan plus report version; monitoring checks by target plus scheduled window; jobs by domain idempotency key.
- Duplicate execution must return the prior durable result, not create a second fulfillment, PDF, notification, or incident.

## Security

Job payloads never contain raw secrets. Webhook/payment signatures are generated or verified in server/worker provider boundaries. Worker re-checks exact resource ownership and URL safety before execution. Logs contain payload digests and IDs, not credentials or full sensitive content.
