export class MetricsCollector {
  private static instance: MetricsCollector | null = null;
  private metrics = {
    scansStarted: 0,
    scansCompleted: 0,
    scansFailed: 0,
    totalScanDurationMs: 0,
    workerFailures: 0,
    apiRequestsCount: 0,
    aiFailures: 0,
  };

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public recordScanStart(): void {
    this.metrics.scansStarted++;
  }

  public recordScanSuccess(durationMs: number): void {
    this.metrics.scansCompleted++;
    this.metrics.totalScanDurationMs += durationMs;
  }

  public recordScanFailure(): void {
    this.metrics.scansFailed++;
  }

  public recordWorkerFailure(): void {
    this.metrics.workerFailures++;
  }

  public recordAiFailure(): void {
    this.metrics.aiFailures++;
  }

  public getSnapshot(): Record<string, any> {
    const avgDurationMs = this.metrics.scansCompleted > 0
      ? Math.round(this.metrics.totalScanDurationMs / this.metrics.scansCompleted)
      : 0;

    return {
      ...this.metrics,
      averageScanDurationMs: avgDurationMs,
      timestamp: new Date().toISOString(),
    };
  }
}

export const metrics = MetricsCollector.getInstance();
