# API Gateway — Architecture Documentation

## Overview

The API Gateway is the **single entry point** for all client traffic into the Hire1Percent platform. It is a completely **stateless** reverse proxy that manages cross-cutting concerns and delegates authentication verification to the Auth Service.

The Gateway **never** stores users, sessions, or business state. It **never** accesses MongoDB or Redis directly.

## Architecture Diagram

```
                    Client (Frontend / Mobile / SDK)
                              │
                              ▼
                    ┌─────────────────────┐
                    │    API Gateway       │
                    │  (Express.js :4000)  │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Auth Service    Job Service    Candidate Service
        (:5001)         (:5002)        (:5003)
```

## Middleware Pipeline

Requests flow through the middleware stack in this exact order:

| # | Middleware           | Purpose                                      |
|---|----------------------|----------------------------------------------|
| 1 | Helmet               | Security headers (CSP, HSTS, etc.)           |
| 2 | Compression          | Gzip response compression                    |
| 3 | CORS                 | Cross-Origin Resource Sharing configuration  |
| 4 | Request ID           | Generates UUID `X-Request-ID` per request    |
| 5 | Correlation ID       | Propagates or generates `X-Correlation-ID`   |
| 6 | Request Logger       | Morgan-based structured logging              |
| 7 | Request Validator    | Content-type validation                      |
| 8 | Global Rate Limiter  | DOS protection (configurable window/max)     |
| 9 | Health Controller    | `/health`, `/ready`, `/live` endpoints       |
| 10| Dynamic Route Router | Auth → Policy → Freeze → Timeout → Proxy    |
| 11| Error Handler        | Standardized JSON error envelope              |
| 12| 404 Fallback         | Catches unmatched routes                     |

## Authentication Flow

The Gateway **never decodes JWTs** or reads Redis/MongoDB. It delegates all verification to the Auth Service:

```
Client Request
    │
    ▼
Extract `Authorization: Bearer <Access UUID>`
    │
    ▼
Validate UUID format (regex check only)
    │
    ▼
POST /api/v1/auth/verify  →  Auth Service
    │
    ▼
Receive { user, session, permissions }
    │
    ▼
Strip spoofed X-H1P-* and X-Authenticated-* headers
    │
    ▼
Inject trusted headers:
  X-H1P-User-ID
  X-H1P-Role
  X-H1P-Permissions
  X-H1P-Session-ID
  X-H1P-Auth-Version
    │
    ▼
Proxy request to downstream business service
```

## Authorization Model

The Gateway performs **only route-level permission checks** defined in the Route Registry. It checks whether the user's permissions array (returned by Auth Service) includes the required permission for the route.

**The Gateway never checks:**
- Job ownership
- Subscription validity
- Candidate eligibility
- Interview ownership
- Organization-level rules

These are **business authorization** concerns and belong inside the downstream business services.

## Route Registry

All routes are defined declaratively in `routeRegistry.js`. Each entry specifies:

- `path` — Express route pattern
- `method` — HTTP method or `*` for wildcard
- `serviceKey` — Target downstream service identifier
- `authRequired` — Whether authentication is required
- `permissions` — Required permission strings for route access
- `policies` — Named policy middleware to apply
- `timeout` — Gateway and downstream timeout values
- `rateLimit` — Rate limiting tier (`strict` or `default`)
- `bodyLimit` — Maximum request body size

## Circuit Breaking

Each downstream service has a dedicated Opossum circuit breaker instance. When a service becomes unreachable, the breaker opens and returns `503 Service Unavailable` without forwarding requests, preventing cascade failures.

## Key Design Constraints

1. **No MongoDB** — The Gateway has zero database dependencies.
2. **No Redis** — Session state is never accessed directly.
3. **No JWT Decoding** — Tokens are opaque UUIDs; decoding happens in Auth Service.
4. **No Business Logic** — The Gateway routes, authenticates, and proxies. Nothing more.
5. **Stateless** — Any Gateway instance can handle any request. Horizontal scaling is trivial.

## Key Files

| File | Purpose |
|------|---------|
| `src/app.js` | Express app assembly and middleware wiring |
| `src/server.js` | HTTP server lifecycle and graceful shutdown |
| `src/gateway/clients/auth.client.js` | Auth Service communication client |
| `src/gateway/middlewares/auth.middleware.js` | Token extraction, verification, header injection |
| `src/gateway/middlewares/policy.middleware.js` | Route-level permission enforcement |
| `src/gateway/routes/routeRegistry.js` | Declarative route definitions |
| `src/gateway/routes/index.js` | Dynamic route assembly from registry |
| `src/gateway/proxy/proxyFactory.js` | Circuit-breaker-wrapped HTTP proxy creation |
| `src/gateway/health/health.controller.js` | Health, readiness, and liveness probes |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | Gateway listen port |
| `AUTH_SERVICE_URL` | `http://localhost:5001` | Auth Service base URL |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `AUTH_CACHE_ENABLED` | `true` | Enable verify response caching |
| `AUTH_CACHE_TTL_MS` | `2000` | Verify cache TTL |
