export class RetryPolicy {
  /** Error substrings that are permanent — retrying cannot fix them. */
  private static readonly NON_RETRYABLE = [
    'ssrf guard',
    'invalid url',
    'unauthorized',
    'forbidden',
    'bad request',
    // Provider/config conditions: no amount of retries adds credentials
    'provider_not_configured',
    'unsupported_notification_provider',
    'invalid_notification_payload',
    // Watchdog contract violations: target misconfiguration is permanent
    'watchdog_target_invalid',
    'watchdog_target_not_found',
    // AI safety rejections: invalid model output will not improve on retry
    'ai_output_unsupported_claim',
    'ai_output_fabricated_revenue_estimate',
    'ai_output_empty',
    'ai_output_invalid',
  ];

  public static shouldRetry(error: any, currentAttempt: number, maxAttempts: number): boolean {
    if (currentAttempt >= maxAttempts) return false;

    const errMsg = (error?.message || '').toLowerCase();

    // Do NOT retry non-transient errors
    for (const marker of RetryPolicy.NON_RETRYABLE) {
      if (errMsg.includes(marker)) return false;
    }

    // Retry transient network/timeout/503 errors
    return true;
  }

  public static getBackoffDelayMs(attempt: number): number {
    return Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500); // Exponential backoff + jitter
  }
}
