# ADR-0002: Authentication Service Design

## Status
**Accepted** — June 2026

## Context

The Hire1Percent platform requires a centralized identity provider that manages authentication, session lifecycle, role-based access control, and multi-tenancy. The Auth Service must serve as the single source of truth for user identity, consumed exclusively by the API Gateway during request verification.

### Key Questions
1. Should tokens be JWTs sent directly to clients, or opaque UUIDs mapping to server-side sessions?
2. How should session state be stored for fast verification?
3. How should key material be managed for JWT signing?
4. How should refresh token security be handled?
5. Should the Auth Service implement business authorization?

## Decision

### 1. Opaque UUID Access Tokens
Clients receive **opaque UUID access tokens**, not raw JWTs. The Auth Service maintains an internal mapping:

```
Access UUID → Redis (cached signed JWT) → MongoDB (session record)
```

**Rationale:**
- Opaque tokens reveal nothing about the user to the client or network intermediaries.
- Token revocation is immediate (delete from Redis/MongoDB) — no waiting for JWT expiry.
- Token format can change without client-side changes.
- JWTs are still used internally for cryptographic integrity between Redis and the verification logic.

### 2. Dual-Store Session Architecture
- **Redis** (primary): Fast session lookup. Maps `session:<uuid>` → signed JWT string. TTL matches access token expiry.
- **MongoDB** (fallback): Persistent session records. Used when Redis is unavailable or cache misses occur. The service re-signs and re-caches on fallback hits.

This provides sub-millisecond verification in the happy path while maintaining durability.

### 3. RS256 JWT Signing
JWTs are signed using **RSA SHA-256 (RS256)** with a 2048-bit key pair.

**Rationale:**
- Asymmetric signing allows the public key to be distributed via JWKS endpoint without exposing the signing key.
- External services can verify tokens independently if needed.
- Key rotation is supported by the `kid` (Key ID) field in the JWKS response.

**Key Management:**
- **Development**: Keys auto-generated to `keys/` directory if missing.
- **Production**: Keys mounted via Kubernetes Secrets, Docker Secrets, or cloud key vaults. Never generated at container startup.

### 4. Refresh Token Rotation (RTR) with Reuse Detection
Refresh tokens implement **Refresh Token Rotation** as recommended by OAuth 2.0 security best practices:

- Each refresh produces a new access + refresh token pair.
- The old refresh token is marked as revoked and linked to the new one.
- If a revoked refresh token is reused, **all sessions for that user are immediately revoked** (reuse detection), and an audit event is logged.

This protects against token theft scenarios where an attacker and legitimate user race to use the same refresh token.

### 5. Platform-Only Authorization
The Auth Service implements **only platform-level authorization** via the `/resource-access-check` endpoint. This evaluates shared policies (e.g., "can this role access admin resources?").

The Auth Service **never** implements:
- Job ownership checks
- Subscription validity
- Candidate eligibility
- Interview ownership
- Organization-specific business rules

These belong inside their respective business microservices.

### 6. Repository Pattern
All database operations go through dedicated Repository classes. Controllers never import Mongoose models directly. This:
- Makes persistence logic testable in isolation.
- Enables future migration to different data stores without changing business logic.
- Enforces consistent query patterns (population, indexing, validation).

## Consequences

### Positive
- Immediate token revocation without waiting for JWT expiry.
- Clients never see internal token structure.
- Sub-millisecond verification via Redis cache.
- Refresh token theft is detected and mitigated automatically.
- Clean separation between platform identity and business authorization.

### Negative
- Two data stores (MongoDB + Redis) increase operational complexity.
- Redis unavailability degrades verification latency (falls back to MongoDB).
- Opaque tokens require a network call for every verification (handled by Gateway caching).

### Risks
- Redis data loss requires session re-establishment from MongoDB (handled by fallback logic).
- RSA key compromise requires immediate key rotation and session invalidation.
- Audit log volume may grow rapidly under high traffic (mitigated by TTL-based cleanup).

## References
- [auth-service.md](../architecture/auth-service.md) — Full architecture documentation
- [auth-service.yaml](../api/auth-service.yaml) — OpenAPI contract
- [session.service.js](file:///c:/Users/sravy/OneDrive/Desktop/Talent%20ecosystem/auth-service/src/security/session.service.js) — Session lifecycle orchestrator
- [auth.controller.js](file:///c:/Users/sravy/OneDrive/Desktop/Talent%20ecosystem/auth-service/src/controllers/auth.controller.js) — Auth endpoint handlers
