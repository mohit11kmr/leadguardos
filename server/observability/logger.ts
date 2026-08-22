export interface LogContext {
  requestId?: string;
  scanId?: string;
  jobId?: string;
  userId?: string;
  operation?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: string;
}

export class Logger {
  private static redactSecrets(message: string): string {
    if (!message) return '';
    return message
      .replace(/JWT_SECRET=[^&\s]+/gi, 'JWT_SECRET=[REDACTED]')
      .replace(/RAZORPAY_KEY_SECRET=[^&\s]+/gi, 'RAZORPAY_KEY_SECRET=[REDACTED]')
      .replace(/bearer\s+[a-zA-Z0-9\._\-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/lg_live_[a-f0-9]{32}/gi, 'lg_live_[REDACTED_KEY]');
  }

  public static info(message: string, ctx: LogContext = {}): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: this.redactSecrets(message),
      ...ctx,
    };
    console.log(JSON.stringify(payload));
  }

  public static warn(message: string, ctx: LogContext = {}): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message: this.redactSecrets(message),
      ...ctx,
    };
    console.warn(JSON.stringify(payload));
  }

  public static error(message: string, error?: any, ctx: LogContext = {}): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: this.redactSecrets(message),
      errorDetail: error?.message || error,
      ...ctx,
    };
    console.error(JSON.stringify(payload));
  }
}
