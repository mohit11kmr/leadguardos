export class TimeoutManager {
  public static async runWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallbackValue: T,
    label = 'Operation'
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`[TimeoutManager] ${label} timed out after ${timeoutMs}ms.`);
        resolve(fallbackValue);
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timer!);
    }
  }
}
