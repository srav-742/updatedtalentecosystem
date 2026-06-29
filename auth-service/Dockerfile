# ──────────────────────────────────────────────────────────────
# Hire1Percent Auth Service — Production Dockerfile
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

# Create directories for logs and key mounts with correct ownership
# NOTE: In production, mount keys via Kubernetes Secrets or Docker Secrets
#       into /app/keys/private.pem and /app/keys/public.pem.
#       The keys/ directory is created here as a mount point.
RUN mkdir -p /app/logs /app/keys && chown -R appuser:appgroup /app

# Copy development keys (will be overridden by production mounts)
# Only copy if they exist in the build context
COPY --chown=appuser:appgroup keys/ ./keys/

# Switch to non-root user
USER appuser

# Expose auth service port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/live || exit 1

# Start the auth service
CMD ["node", "src/server.js"]
