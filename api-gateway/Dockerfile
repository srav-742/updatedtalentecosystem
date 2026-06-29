# ──────────────────────────────────────────────────────────────
# Hire1Percent API Gateway — Production Dockerfile
# Multi-stage build for minimal attack surface and image size
# ──────────────────────────────────────────────────────────────

# ─── Stage 1: Install Dependencies ─────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ─── Stage 2: Production Runner ───────────────────────────
FROM node:18-alpine AS runner

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src/ ./src/
COPY openapi/ ./openapi/

# Create logs directory with correct ownership
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose gateway port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/live || exit 1

# Start the gateway
CMD ["node", "src/server.js"]
