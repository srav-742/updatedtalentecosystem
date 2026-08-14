import { getContext, createContext } from '../context/index.js';
import { generateCorrelationId, generateRequestId, extractTraceContext } from '../tracing/index.js';
import { sendError } from '../response/index.js';
import { parseHeaders } from '../headers/index.js';
import { STATUS_CODES } from '../constants/index.js';

// 1. Correlation middleware
export const correlationMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  req.headers['x-correlation-id'] = correlationId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);

  req.correlationId = correlationId;
  req.requestId = requestId;

  next();
};

// 2. Context middleware
export const contextMiddleware = (req, res, next) => {
  const traceCtx = extractTraceContext(req.headers);
  const identity = parseHeaders(req.headers);

  const context = {
    requestId: req.requestId || traceCtx.requestId,
    correlationId: req.correlationId || traceCtx.correlationId,
    traceId: traceCtx.traceId,
    spanId: traceCtx.spanId,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    startTime: Date.now(),
    ...identity,
  };

  createContext(context, () => {
    next();
  });
};

// 3. Error handler middleware
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  sendError(res, err);
};

// 4. Request logger middleware
export const requestLogger = (loggerInstance) => (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    };

    if (res.statusCode >= 500) {
      loggerInstance.error(`${req.method} ${req.originalUrl} failed with status ${res.statusCode}`, logData);
    } else {
      loggerInstance.info(`${req.method} ${req.originalUrl} processed in ${duration}ms`, logData);
    }
  });

  next();
};

// 5. Response wrapper middleware
export const responseWrapper = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && (body.success === true || body.success === false)) {
      return originalJson.call(this, body);
    }
    
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const ctx = getContext ? getContext() : null;
    const formatted = {
      success,
      status: res.statusCode,
      message: success ? 'Success' : 'Error',
      [success ? 'data' : 'error']: body,
      correlationId: ctx?.correlationId || null,
      timestamp: new Date().toISOString(),
    };

    return originalJson.call(this, formatted);
  };
  next();
};

export default {
  correlationMiddleware,
  contextMiddleware,
  errorHandler,
  requestLogger,
  responseWrapper,
};
