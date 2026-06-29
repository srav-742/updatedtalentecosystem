import test from 'node:test';
import assert from 'node:assert';
import EventEmitter from 'node:events';
import winston from 'winston';

import {
  config,
  context,
  tracing,
  headers,
  constants,
  permissions,
  errors,
  response,
  validation,
  events,
  logger,
  middleware,
  utils,
  types,
} from '../index.js';

// ─── 1. CONFIG MODULE TESTS ───────────────────────────
test('config: loadConfig should correctly load and validate config', (t) => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  process.env.TEST_REQUIRED_VAR = 'present';
  const cfg = config.loadConfig({
    required: ['TEST_REQUIRED_VAR'],
    defaults: {
      TEST_DEFAULT_VAR: 'default-value',
      PORT: '6000',
      TEST_INT: '123',
      TEST_BOOL: 'true',
    },
    exitOnFailure: false,
  });

  assert.strictEqual(cfg.get('TEST_REQUIRED_VAR'), 'present');
  assert.strictEqual(cfg.get('TEST_DEFAULT_VAR'), 'default-value');
  assert.strictEqual(cfg.port, 6000);
  assert.strictEqual(cfg.isDevelopment, true);

  // Test getInteger and getBoolean
  assert.strictEqual(cfg.getInteger('TEST_INT'), 123);
  assert.strictEqual(cfg.getBoolean('TEST_BOOL'), true);
  assert.strictEqual(cfg.get('NON_EXISTENT', 'fallback'), 'fallback');

  // Test missing var error
  assert.throws(() => {
    config.loadConfig({
      required: ['MISSING_VAR_DEFINITELY'],
      exitOnFailure: false,
    });
  }, /Missing required environment variables/);
  process.env.NODE_ENV = originalEnv;
});

// ─── 2. CONTEXT MODULE TESTS ──────────────────────────
test('context: AsyncLocalStorage wrapper operations', (t) => {
  const initial = { testKey: 'val1' };

  context.createContext(initial, () => {
    const ctx = context.getContext();
    assert.deepStrictEqual(ctx, initial);

    context.setContext('anotherKey', 'val2');
    assert.strictEqual(ctx.anotherKey, 'val2');

    context.setContext({ bulkKey: 'val3' });
    assert.strictEqual(ctx.bulkKey, 'val3');

    context.freezeContext();
    assert.throws(() => {
      ctx.testKey = 'changed';
    });

    context.clearContext();
    assert.deepStrictEqual(context.getContext(), {});
  });
});

// ─── 3. TRACING MODULE TESTS ──────────────────────────
test('tracing: ID generators and traceparent propagation', (t) => {
  const reqId = tracing.generateRequestId();
  const cid = tracing.generateCorrelationId();
  const traceId = tracing.generateTraceId();
  const spanId = tracing.generateSpanId();

  assert.strictEqual(typeof reqId, 'string');
  assert.match(cid, /^CID-/);
  assert.strictEqual(traceId.length, 32);
  assert.strictEqual(spanId.length, 16);

  const tp = tracing.buildTraceparent(traceId, spanId);
  assert.strictEqual(tp, `00-${traceId}-${spanId}-01`);

  const parsed = tracing.parseTraceparent(tp);
  assert.strictEqual(parsed.traceId, traceId);
  assert.strictEqual(parsed.spanId, spanId);

  const headers = {
    traceparent: tp,
    'x-correlation-id': 'custom-cid',
  };
  const extracted = tracing.extractTraceContext(headers);
  assert.strictEqual(extracted.traceId, traceId);
  assert.strictEqual(extracted.correlationId, 'custom-cid');

  const injected = tracing.injectTraceContext({}, extracted);
  assert.strictEqual(injected['x-correlation-id'], 'custom-cid');
  assert.match(injected['traceparent'], /^00-/);
});

// ─── 4. HEADERS MODULE TESTS ──────────────────────────
test('headers: parser, builder, validator', (t) => {
  const rawHeaders = {
    'x-h1p-user-id': 'usr_1',
    'x-h1p-role': 'recruiter',
    'x-h1p-permissions': 'jobs:read,jobs:create',
    'x-h1p-auth-version': '1',
  };

  const parsed = headers.parseHeaders(rawHeaders);
  assert.strictEqual(parsed.userId, 'usr_1');
  assert.strictEqual(parsed.role, 'recruiter');
  assert.deepStrictEqual(parsed.permissions, ['jobs:read', 'jobs:create']);
  assert.strictEqual(parsed.authVersion, '1');

  const built = headers.buildHeaders(parsed);
  assert.strictEqual(built['X-H1P-User-ID'], 'usr_1');
  assert.strictEqual(built['X-H1P-Role'], 'recruiter');
  assert.strictEqual(built['X-H1P-Permissions'], 'jobs:read,jobs:create');

  const validation = headers.validateHeaders(rawHeaders);
  assert.strictEqual(validation.valid, true);

  const invalidHeaders = {
    'x-h1p-role': 'recruiter',
  };
  const invalidValidation = headers.validateHeaders(invalidHeaders);
  assert.strictEqual(invalidValidation.valid, false);
});

// ─── 5. CONSTANTS MODULE TESTS ────────────────────────
test('constants: hasMinimumRole hierarchy validation', (t) => {
  assert.strictEqual(constants.STATUS_CODES.OK, 200);
  assert.strictEqual(constants.ERROR_CODES.AUTH_001, 'AUTH_001');

  assert.strictEqual(constants.hasMinimumRole('admin', 'recruiter'), true);
  assert.strictEqual(constants.hasMinimumRole('candidate', 'admin'), false);
  assert.strictEqual(constants.hasMinimumRole('guest', 'admin'), false);
  assert.strictEqual(constants.hasMinimumRole('invalid-role', 'admin'), false);
});

// ─── 6. PERMISSIONS MODULE TESTS ──────────────────────
test('permissions: verify permission strings existence', (t) => {
  assert.strictEqual(permissions.JOB_CREATE, 'jobs:create');
  assert.strictEqual(permissions.INTERVIEWS_READ, 'interviews:read');
});

// ─── 7. ERRORS MODULE TESTS ───────────────────────────
test('errors: ApiError subclasses instantiation and serialization', (t) => {
  const err = new errors.ValidationError('Invalid input', { field: 'email' });
  assert.strictEqual(err.status, 400);
  assert.strictEqual(err.message, 'Invalid input');
  assert.deepStrictEqual(err.details, { field: 'email' });
  assert.strictEqual(err.isOperational, true);

  const json = err.toJSON();
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.status, 400);
  assert.deepStrictEqual(json.details, { field: 'email' });

  // Test static factory methods
  const badReq = errors.ApiError.badRequest('bad-msg');
  assert.strictEqual(badReq instanceof errors.ValidationError, true);
  assert.strictEqual(badReq.message, 'bad-msg');

  const forbidden = errors.ApiError.forbidden('forbidden-msg');
  assert.strictEqual(forbidden instanceof errors.AuthorizationError, true);

  const notFound = errors.ApiError.notFound();
  assert.strictEqual(notFound instanceof errors.NotFoundError, true);
});

// ─── 8. RESPONSE MODULE TESTS ─────────────────────────
test('response: mock response helpers', (t) => {
  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
    }
  };

  response.sendSuccess(mockRes, { data: { x: 1 }, message: 'Done' });
  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.deepStrictEqual(mockRes.body.data, { x: 1 });

  response.sendCreated(mockRes, { id: 'created' });
  assert.strictEqual(mockRes.statusCode, 201);

  response.sendNoContent(mockRes);
  assert.strictEqual(mockRes.statusCode, 204);
  assert.strictEqual(mockRes.ended, true);

  const error = new errors.AuthenticationError('Expired token', 'AUTH_002');
  response.sendError(mockRes, error);
  assert.strictEqual(mockRes.statusCode, 401);
  assert.strictEqual(mockRes.body.success, false);
  assert.strictEqual(mockRes.body.code, 'AUTH_002');
});

// ─── 9. VALIDATION MODULE TESTS ───────────────────────
test('validation: format checking and validator middleware', (t) => {
  assert.strictEqual(validation.isValidEmail('test@h1p.com'), true);
  assert.strictEqual(validation.isValidEmail('invalid-email'), false);

  assert.strictEqual(validation.isValidUuid(tracing.generateRequestId()), true);
  assert.strictEqual(validation.isValidUuid('invalid-uuid'), false);

  const pag = validation.validatePagination({ page: '2', limit: '25' });
  assert.deepStrictEqual(pag, { page: 2, limit: 25 });

  const invalidPag = validation.validatePagination({ page: 'abc', limit: '-5' });
  assert.deepStrictEqual(invalidPag, { page: 1, limit: 10 });

  // Test validation middleware builder
  const validator = (data) => {
    if (!data.email) return 'Email required';
  };
  const mw = validation.validateSchema(validator);
  
  let nextCalled = false;
  let passedError = null;
  const mockReq = { body: {} };
  const mockRes = {};
  const mockNext = (err) => {
    nextCalled = true;
    passedError = err;
  };

  mw(mockReq, mockRes, mockNext);
  assert.strictEqual(nextCalled, true);
  assert.strictEqual(passedError instanceof errors.ValidationError, true);
  assert.strictEqual(passedError.message, 'Email required');
});

// ─── 10. EVENTS MODULE TESTS ──────────────────────────
test('events: EventBus emitter functionality', (t) => {
  const bus = new events.EventBus();
  let received = false;
  
  bus.on('test-event', (data) => {
    received = data;
  });

  bus.emitSafe('test-event', 'val1');
  assert.strictEqual(received, 'val1');

  // Verify that an error in a handler doesn't crash emitSafe
  bus.on('error-event', () => {
    throw new Error('listener failure');
  });
  
  const result = bus.emitSafe('error-event');
  assert.strictEqual(result, false);
});

// ─── 11. LOGGER MODULE TESTS ──────────────────────────
test('logger: createLogger initializes winston logger', (t) => {
  const log = logger.createLogger('test-service', { nodeEnv: 'development', enableFiles: false });
  assert.strictEqual(log instanceof winston.Logger, true);
});

// ─── 12. MIDDLEWARE MODULE TESTS ──────────────────────
test('middleware: express middleware chain mock calls', (t) => {
  // Mock Request Logger
  const mockLogger = {
    info() {},
    error() {},
  };
  const logMw = middleware.requestLogger(mockLogger);
  
  const req = { method: 'GET', path: '/test', headers: {}, socket: {} };
  
  // Create mock emitter to trigger res 'finish'
  class MockResEmitter extends EventEmitter {
    constructor() {
      super();
      this.statusCode = 200;
      this.headers = {};
    }
    setHeader(key, val) {
      this.headers[key] = val;
    }
  }
  const res = new MockResEmitter();
  
  let nextCalled = false;
  logMw(req, res, () => {
    nextCalled = true;
  });
  
  assert.strictEqual(nextCalled, true);
  res.emit('finish');

  // Mock Correlation
  let cidCalled = false;
  middleware.correlationMiddleware(req, res, () => {
    cidCalled = true;
  });
  assert.strictEqual(cidCalled, true);
  assert.strictEqual(typeof req.correlationId, 'string');
});

// ─── 13. UTILS MODULE TESTS ───────────────────────────
test('utils: helpers validation', async (t) => {
  assert.strictEqual(utils.isValidUuid(utils.generateUuid()), true);
  assert.strictEqual(utils.getTimestamp() > 0, true);

  // sleep
  const start = Date.now();
  await utils.sleep(50);
  assert.strictEqual(Date.now() - start >= 45, true);

  // retry
  let runs = 0;
  const val = await utils.retry(async () => {
    runs++;
    if (runs < 3) throw new Error('fail');
    return 'success';
  }, 5, 10);
  assert.strictEqual(val, 'success');
  assert.strictEqual(runs, 3);

  // deepClone & merge
  const origin = { a: 1, b: { c: 2 } };
  const cloned = utils.deepClone(origin);
  cloned.b.c = 9;
  assert.strictEqual(origin.b.c, 2);

  const merged = utils.merge({ a: 1 }, { b: 2 });
  assert.deepStrictEqual(merged, { a: 1, b: 2 });

  // casing
  assert.strictEqual(utils.camelCase('hello-world_test'), 'helloWorldTest');
  assert.strictEqual(utils.snakeCase('helloWorldTest'), 'hello_world_test');

  // safeJsonParse
  assert.deepStrictEqual(utils.safeJsonParse('{"a":1}'), { a: 1 });
  assert.strictEqual(utils.safeJsonParse('invalid', 'fallback'), 'fallback');

  // Crypto
  const key = 'secret';
  const hashed = utils.hash('test-string');
  assert.strictEqual(hashed.length, 64);

  const text = 'my-secret-payload';
  const encrypted = utils.encrypt(text, key);
  assert.notStrictEqual(encrypted, text);

  const decrypted = utils.decrypt(encrypted, key);
  assert.strictEqual(decrypted, text);
});
