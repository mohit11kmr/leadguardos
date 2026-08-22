export class RetryPolicy {
  public static shouldRetry(error: any, currentAttempt: number, maxAttempts: number): boolean {
    if (currentAttempt >= maxAttempts) return false;

    const errMsg = (error?.message || '').toLowerCase();

    // Do NOT retry non-transient errors
    if (
      errMsg.includes('ssrf guard') ||
      errMsg.includes('invalid url') ||
      errMsg.includes('unauthorized') ||
      errMsg.includes('forbidden') ||
      errMsg.includes('bad request')
    ) {
      return false;
    }

    // Retry transient network/timeout/503 errors
    return true;
  }

  public static getBackoffDelayMs(attempt: number): number {
    return Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500); // Exponential backoff + jitter
  }
}
