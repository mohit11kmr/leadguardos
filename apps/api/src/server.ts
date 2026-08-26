import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const server = createServer(createApp({ allowedOrigins, version: "v6-shell" }));

server.listen(port, () => {
  console.log(`[V6 API] shell listening on http://localhost:${port}`);
});

const shutdown = (signal: string) => {
  console.log(`[V6 API] received ${signal}; shutting down`);
  server.close((error) => {
    if (error) {
      console.error("[V6 API] shutdown failed", error);
      process.exitCode = 1;
    }
  });
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
