# ADR-0001: API Gateway Design

## Status
**Accepted** — June 2026

## Context

The Hire1Percent platform requires a centralized entry point that handles cross-cutting concerns (security, rate limiting, tracing, compression) while remaining decoupled from business logic. The platform follows a microservices architecture with multiple downstream services (Auth, Job, Candidate, Resume, Interview, Assessment, Notification, Admin).

### Key Questions
1. Should the Gateway be stateless or maintain session state?
2. Should the Gateway decode JWTs directly or delegate to the Auth Service?
3. How should downstream services be registered and discovered?
4. How should authorization be partitioned between the Gateway and business services?

## Decision

### 1. Fully Stateless Gateway
The Gateway maintains **zero persistent state**. It does not use MongoDB, Redis, or any data store. Every Gateway instance is identical and independently replaceable, enabling trivial horizontal scaling.

### 2. Token Verification Delegation
The Gateway **never decodes JWTs** or reads session data. It validates only the UUID format of access tokens (regex check), then delegates all verification to `POST /api/v1/auth/verify` on the Auth Service. This ensures:
- The Gateway has no cryptographic key dependencies.
- Token format changes require zero Gateway changes.
- Session revocation is immediately effective (no stale local cache beyond the short TTL).

A short-lived in-memory cache (2s TTL) reduces repeated verify calls for the same token within rapid request bursts.

### 3. Declarative Route Registry
Routes are defined declaratively in a single `routeRegistry.js` file. Each route specifies its target service, authentication requirements, required permissions, rate limit tier, timeout values, and body size limits. This design:
- Makes the routing configuration auditable and version-controlled.
- Eliminates scattered route definitions across multiple files.
- Supports dynamic proxy creation with per-route circuit breakers.

### 4. Split Authorization Model
- **Gateway**: Route-level permission checks only (e.g., does the user have `JOB_CREATE`?).
- **Business Services**: Business-level authorization (e.g., does the user own this job?).

This prevents the Gateway from accumulating business logic over time.

### 5. Anti-Spoofing Header Management
The Gateway strips all client-sent `X-H1P-*` and `X-Authenticated-*` headers before proxying. It then injects trusted headers from the Auth Service verification response. Downstream services can trust these headers unconditionally.

## Consequences

### Positive
- Horizontal scaling requires no coordination between Gateway instances.
- Auth Service changes (token format, key rotation) require zero Gateway changes.
- Route configuration is centralized and auditable.
- Business services receive pre-validated, trusted identity headers.

### Negative
- Every authenticated request incurs a network call to Auth Service (mitigated by 2s cache).
- The Route Registry must be updated when new routes are added.

### Risks
- The verify cache TTL must remain short to avoid stale session data after revocation.
- Circuit breaker misconfiguration could block legitimate traffic during Auth Service restarts.

## References
- [gateway.md](../architecture/gateway.md) — Full architecture documentation
- [auth.client.js](file:///c:/Users/sravy/OneDrive/Desktop/Talent%20ecosystem/api-gateway/src/gateway/clients/auth.client.js) — Auth Service client implementation
- [routeRegistry.js](file:///c:/Users/sravy/OneDrive/Desktop/Talent%20ecosystem/api-gateway/src/gateway/routes/routeRegistry.js) — Declarative route definitions
