import { Server } from 'http';
import { backgroundWorker } from '../queue/worker';
import { watchdogScheduler } from '../watchdogScheduler';
import { db } from '../db/database';
import { Logger } from '../observability/logger';

export class GracefulShutdownHandler {
  private static isShuttingDown = false;

  public static registerSignalHandlers(server: Server): void {
    const handleShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      Logger.info(`[Shutdown] Received ${signal} signal. Initiating graceful shutdown sequence...`);

      // 1. Stop accepting new HTTP connections
      server.close(() => {
        Logger.info('[Shutdown] HTTP server closed for new incoming connections.');
      });

      // 2. Stop schedulers & background workers
      watchdogScheduler.stop();
      backgroundWorker.stop();
      Logger.info('[Shutdown] Background workers and Watchdog scheduler stopped.');

      // 3. Close database and external connections
      await db.close();
      Logger.info('[Shutdown] Clean shutdown completed. Exiting process.');

      process.exit(0);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }
}
