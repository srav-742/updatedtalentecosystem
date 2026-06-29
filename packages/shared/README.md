# @hire1percent/shared

Shared platform library SDK consumed by all microservices within the Hire1Percent platform monorepo (API Gateway, Auth Service, Job Service, Candidate Service, etc.).

This package houses foundational, framework-agnostic utilities (logging, tracing, standard errors, context propagation, trusted headers) to eliminate infrastructure duplication.

## Folder Structure

```text
packages/shared/
├── index.js             # Main package entrypoint exporting all modules
├── package.json         # Package configuration
├── README.md            # Documentation
└── src/
    ├── config/          # Environment configuration loader and validator
    ├── constants/       # Central platform status, error, and event constants
    ├── context/         # AsyncLocalStorage context wrapper
    ├── errors/          # Custom platform Exception/Error classes
    ├── events/          # Lightweight event emitter and lifecycle events
    ├── headers/         # Trusted internal identity header parser & builder
    ├── logger/          # Winston logger factory
    ├── middleware/      # Express middleware helpers (logger, tracer, context, errors)
    ├── permissions/     # Fine-grained permission definitions
    ├── response/        # Success & error JSON response helpers
    ├── tracing/         # Distributed tracing ID generators and parser
    ├── types/           # JSDoc type annotations
    ├── utils/           # Math, time, retry, crypto, object, and string utilities
    └── validation/      # Email, UUID, and pagination validators
```

## Import and Usage Examples

To use the shared package in a microservice, add the dependency to your `package.json`:

```json
"dependencies": {
  "@hire1percent/shared": "file:../packages/shared"
}
```

### Context & Logging

```javascript
import { logger, context } from '@hire1percent/shared';

// Create a logger instance for your service
const myLogger = logger.createLogger('my-service');

// Run within an asynchronous request context
context.createContext({ requestId: 'abc-123', correlationId: 'cid-456' }, () => {
  myLogger.info('This log entry automatically includes request context!');
});
```

### Configuration Loader

```javascript
import { config } from '@hire1percent/shared';

const environment = config.loadConfig({
  required: ['PORT', 'NODE_ENV', 'MONGO_URI'],
  defaults: {
    PORT: 5000,
    LOG_LEVEL: 'debug',
  }
});

console.log(environment.port); // 5000
```

### Trusted Header Parser/Builder

```javascript
import { headers } from '@hire1percent/shared';

// Parse trusted headers from an Express request
const identity = headers.parseHeaders(req.headers);
console.log(identity.userId); // 'usr_123'
console.log(identity.role);   // 'recruiter'

// Build headers to send in downstream requests
const outgoingHeaders = headers.buildHeaders(identity);
```

### Reusable Errors & Responses

```javascript
import { errors, response } from '@hire1percent/shared';

// Throwing a standard error
throw new errors.NotFoundError('Job posting not found');

// Standardized response wrapping
response.sendSuccess(res, {
  data: { job: 'Senior Backend Engineer' },
  message: 'Job details fetched successfully'
});
```

## Guidelines

1. **No Business Logic**: Do not include database access schemas, repositories, router rules, or service-specific handlers.
2. **Framework Agnostic**: Export pure JS/TS methods where possible.
3. **Backward Compatibility**: Preserve existing API contracts so current services continue to boot and respond identically.
4. **Stable interfaces**: Keep method signatures consistent.
