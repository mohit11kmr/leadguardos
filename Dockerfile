# Multi-Stage Dockerfile for LeadGuard OS

# ---------------------------------------------------------------------------
# Stage 1: Build Stage
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Run as non-root user
USER node

COPY --chown=node:node package*.json ./
RUN npm ci --only=production

COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Support API and WORKER modes via LEADGUARD_MODE env var.
# Default: api (serves HTTP API + embedded worker)
# Set LEADGUARD_MODE=worker to run standalone worker process
ENV LEADGUARD_MODE=api

CMD if [ "$LEADGUARD_MODE" = "worker" ]; then \
      echo "Starting LeadGuard OS Worker..." && node dist/worker.cjs; \
    else \
      echo "Starting LeadGuard OS API..." && node dist/server.cjs; \
    fi
