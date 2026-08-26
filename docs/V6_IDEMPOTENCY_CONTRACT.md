# V6 Idempotency Contract

This is a Phase 3A design contract; it adds no runtime behavior.

| Operation | Key | Authority | Duplicate result |
|---|---|---|---|
| Payment event | `provider:eventId` | `PaymentEvent` unique record | acknowledge as duplicate; never re-fulfill |
| Payment verification | internal order + provider payment ID | `Order`/`Payment` state machine | return current state; reject mismatched tuple |
| Webhook delivery | `webhookId:eventId` | `WebhookDelivery`/delivery key | return prior delivery status |
| Job enqueue | domain idempotency key | `JobExecution` | return existing job ID |
| Report generation | `scanId:reportVersion:format` | `PdfReport` metadata | return existing verified artifact |
| Monitoring check | `targetId:scheduledWindow` | `WatchdogCheckLog` | return existing check and incident decision |

Keys must be deterministic, bounded, and contain no secret material. The database unique constraint is authoritative; process-local Maps are only test/dev caches. A retry may create a new attempt record but must not create a new business side effect. Idempotency records are retained long enough to cover provider replay windows and operational retries.
