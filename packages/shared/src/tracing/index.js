import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

export const generateRequestId = () => uuidv4();
export const generateCorrelationId = () => `CID-${uuidv4()}`;
export const generateTraceId = () => crypto.randomBytes(16).toString('hex');
export const generateSpanId = () => crypto.randomBytes(8).toString('hex');

export const parseTraceparent = (traceparent) => {
  if (!traceparent || typeof traceparent !== 'string') return null;
  const parts = traceparent.split('-');
  if (parts.length !== 4 || parts[0] !== '00') return null;
  return {
    version: parts[0],
    traceId: parts[1],
    spanId: parts[2],
    traceFlags: parts[3],
  };
};

export const buildTraceparent = (traceId, spanId, traceFlags = '01') => {
  return `00-${traceId}-${spanId}-${traceFlags}`;
};

export const extractTraceContext = (headers = {}) => {
  const normalized = {};
  for (const [key, val] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = val;
  }

  const traceparent = normalized['traceparent'] || null;
  const tracestate = normalized['tracestate'] || null;
  const requestId = normalized['x-request-id'] || generateRequestId();
  const correlationId = normalized['x-correlation-id'] || generateCorrelationId();

  const parsed = parseTraceparent(traceparent);
  return {
    traceId: parsed?.traceId || generateTraceId(),
    spanId: parsed?.spanId || generateSpanId(),
    traceparent,
    tracestate,
    requestId,
    correlationId,
  };
};

export const injectTraceContext = (headers = {}, context = {}) => {
  const spanId = context.spanId || generateSpanId();
  const traceId = context.traceId || generateTraceId();

  headers['x-request-id'] = context.requestId || generateRequestId();
  headers['x-correlation-id'] = context.correlationId || generateCorrelationId();
  headers['traceparent'] = buildTraceparent(traceId, spanId, context.traceFlags || '01');
  
  if (context.tracestate) {
    headers['tracestate'] = context.tracestate;
  }

  return headers;
};

export default {
  generateRequestId,
  generateCorrelationId,
  generateTraceId,
  generateSpanId,
  parseTraceparent,
  buildTraceparent,
  extractTraceContext,
  injectTraceContext,
};
