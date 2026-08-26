import express, { type Express, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

export interface ApiAppOptions {
  allowedOrigins?: string[];
  version?: string;
}

export function createApp(options: ApiAppOptions = {}): Express {
  const app = express();
  const allowedOrigins = new Set(options.allowedOrigins ?? ["http://localhost:5173"]);

  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") || randomUUID();
    response.setHeader("x-request-id", requestId);
    next();
  });
  app.use((request, response, next) => {
    const origin = request.header("origin");
    if (origin && allowedOrigins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      response.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      response.setHeader("access-control-allow-headers", "Content-Type, Authorization, X-Request-ID");
      response.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.json({ status: "ok", version: options.version });
  });

  app.use((_request, response) => {
    response.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use((error: unknown, _request: Request, response: Response, _next: express.NextFunction) => {
    console.error("[V6 API] unhandled error", error);
    response.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  return app;
}
