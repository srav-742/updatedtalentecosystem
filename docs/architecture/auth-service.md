# Auth Service — Architecture Documentation

## Overview

The Authentication Service is the **single source of truth for identity** across the Hire1Percent platform. It manages users, roles, permissions, organizations, tenants, sessions, and cryptographic key material.

The Auth Service is **not a business service**. It owns identity and access management. Business rules (job ownership, subscription validity, etc.) belong in domain microservices.

## Architecture Diagram

```
              API Gateway
                  │
                  ▼
        ┌─────────────────────┐
        │    Auth Service      │
        │  (Express.js :5001)  │
        └─────────┬───────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
       MongoDB          Redis
    (Users, Roles,    (Sessions,
     Permissions,      Access UUIDs,
     Organizations,    Refresh UUIDs,
     Tenants,          Session Cache)
     Audit Logs)
```

## Clean Architecture Layers

```
Controllers  →  Services  →  Repositories  →  Models (MongoDB)
     │              │              │
     │              │              └── Direct Mongoose queries only
     │              └── Business logic, orchestration, validation
     └── Request parsing, response formatting, error delegation
```

**Rules:**
- Controllers contain **no business logic** — they parse requests and call services.
- Services contain **all business logic** — they orchestrate repositories and security modules.
- Repositories contain **only persistence logic** — they abstract Mongoose queries.
- Models define **only schema structure** — they hold no business rules.

## Data Models

| Model | Collection | Purpose |
|-------|------------|---------|
| `User` | `users` | User accounts with credentials and role references |
| `Role` | `roles` | Named roles with permission arrays |
| `Permission` | `permissions` | Granular permission definitions |
| `Organization` | `organizations` | Business divisions under tenants |
| `Tenant` | `tenants` | Top-level multi-tenancy entities |
| `Session` | `sessions` | Active access token sessions |
| `RefreshToken` | `refreshtokens` | Refresh token records with rotation tracking |
| `AuditLog` | `auditlogs` | Security event audit trail |

## Repository Pattern

Every persistence operation goes through a dedicated repository class:

| Repository | Model | Key Methods |
|------------|-------|-------------|
| `UserRepository` | User | `findById`, `findByEmail`, `findByEmailWithPermissions`, `create`, `update`, `delete` |
| `RoleRepository` | Role | `findById`, `findByName`, `create`, `update`, `delete`, `addPermission`, `removePermission` |
| `PermissionRepository` | Permission | `findById`, `findByName`, `createMany`, `delete` |
| `OrganizationRepository` | Organization | `findById`, `findByCode`, `findByTenantId`, `create`, `update`, `deactivate`, `delete` |
| `SessionRepository` | Session | `create`, `findByToken`, `revokeByToken`, `revokeAllByUserId`, `cleanupExpired` |
| `RefreshTokenRepository` | RefreshToken | `create`, `findByToken`, `revoke`, `revokeAllByUserId`, `cleanupExpired` |
| `AuditRepository` | AuditLog | `create`, `findFiltered` |

## Security Architecture

### Password Hashing
- Algorithm: **bcrypt** (10 salt rounds)
- Implementation: `security/password.service.js`

### JWT Signing
- Algorithm: **RS256** (RSA SHA-256)
- Key Material: RSA 2048-bit private/public key pair loaded from filesystem
- Key Path: `keys/private.pem` and `keys/public.pem`
- Implementation: `security/jwt.service.js`

### JWKS Endpoint
- Endpoint: `GET /api/v1/auth/jwks`
- Format: RFC 7517 JSON Web Key Set
- Implementation: `security/keyManager.js`

### Token Model
```
Login
  │
  ├── Generate Access UUID (opaque, v4 UUID)
  ├── Generate Refresh UUID (opaque, v4 UUID)
  ├── Sign JWT (RS256) containing { id, email, role, permissions, sessionId }
  ├── Store Session in MongoDB (UUID → user mapping)
  ├── Cache JWT in Redis (UUID → signed JWT)
  └── Return { accessToken: UUID, refreshToken: UUID, expiresIn }
```

### Token Verification
```
Verify(accessUUID)
  │
  ├── Redis lookup: UUID → cached JWT
  │     ├── Found: Verify JWT signature → return user profile
  │     └── Not found: fallback to MongoDB
  │
  ├── MongoDB lookup: Session.findByToken(UUID)
  │     ├── Found: Re-sign JWT, cache in Redis, return user profile
  │     └── Not found: return 401
  │
  └── Return { success, user, session }
```

### Refresh Token Rotation (RTR)
```
Refresh(refreshUUID)
  │
  ├── Find refresh token in MongoDB
  │     ├── Not found: reject
  │     ├── Already revoked: REUSE DETECTED → revoke ALL user sessions
  │     └── Valid: continue
  │
  ├── Generate new Access UUID + Refresh UUID
  ├── Create new Session in MongoDB
  ├── Create new RefreshToken in MongoDB
  ├── Mark old refresh token as revoked (link to new token)
  ├── Cache new session JWT in Redis
  └── Return new token set
```

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/auth/login` | No | Authenticate credentials |
| `POST` | `/api/v1/auth/verify` | No | Verify access token |
| `POST` | `/api/v1/auth/refresh` | No | Rotate tokens |
| `POST` | `/api/v1/auth/logout` | Yes | Revoke session |
| `POST` | `/api/v1/auth/resource-access-check` | No | Platform access policy check |
| `GET` | `/api/v1/auth/health` | No | Health check with dependency status |
| `GET` | `/api/v1/auth/jwks` | No | RSA public key set |

## Health & Probes

| Endpoint | Purpose | Kubernetes Probe |
|----------|---------|------------------|
| `/health` | Full health with MongoDB/Redis status | — |
| `/ready` | Readiness probe | `readinessProbe` |
| `/live` | Liveness probe | `livenessProbe` |

## Key Files

| File | Purpose |
|------|---------|
| `src/app.js` | Express app assembly |
| `src/server.js` | Server lifecycle with DB/Redis initialization |
| `src/controllers/auth.controller.js` | Request handling for all auth endpoints |
| `src/security/session.service.js` | Session lifecycle orchestrator |
| `src/security/jwt.service.js` | RS256 JWT sign/verify |
| `src/security/keyManager.js` | RSA key loading and JWKS generation |
| `src/security/password.service.js` | bcrypt hashing |
| `src/config/database.js` | MongoDB connection manager |
| `src/config/redis.js` | Redis connection manager |
| `src/authorization/resourceAccessChecker.js` | Platform-level access policy engine |
| `src/authorization/roleEngine.js` | Role normalization (seeker → candidate) |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5001` | Service listen port |
| `MONGO_URI` | — | MongoDB connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
