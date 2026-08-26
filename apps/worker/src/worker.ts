let stopping = false;

console.log("[V6 Worker] shell initialized; no jobs are registered");

const shutdown = (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`[V6 Worker] received ${signal}; exiting cleanly`);
  process.exitCode = 0;
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
