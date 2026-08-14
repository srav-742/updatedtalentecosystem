/**
 * @fileoverview Request ID & W3C Tracing Middleware
 * @module gateway/middlewares/requestId.middleware
 *
 * Ensures every request has a unique X-Request-ID and a W3C traceparent header.
 * Propagates existing traceparents or generates new OpenTelemetry-compliant trace/span IDs.
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import HEADERS from '../../core/constants/headers.js';

/**
 * Request ID and Tracing middleware.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requestIdMiddleware = (req, res, next) => {
  // ─── 1. Request ID Handling ────────────────────────
  const existingId = req.headers[HEADERS.REQUEST_ID.toLowerCase()];
  const requestId = existingId || uuidv4();

  req.headers[HEADERS.REQUEST_ID.toLowerCase()] = requestId;
  res.setHeader(HEADERS.REQUEST_ID, requestId);
  req.requestId = requestId;

  // ─── 2. W3C traceparent distributed tracing ────────
  const rawTraceparent = req.headers['traceparent'];
  let traceId = null;
  let spanId = null;

  if (rawTraceparent) {
    const parts = rawTraceparent.split('-');
    if (parts.length === 4 && parts[0] === '00') {
      traceId = parts[1];
      // Generate a new span ID representing the gateway's segment
      spanId = crypto.randomBytes(8).toString('hex');
    }
  }

  if (!traceId) {
    traceId = crypto.randomBytes(16).toString('hex');
    spanId = crypto.randomBytes(8).toString('hex');
  }

  const traceparent = `00-${traceId}-${spanId}-01`;
  req.headers['traceparent'] = traceparent;
  res.setHeader('traceparent', traceparent);

  req.traceId = traceId;
  req.spanId = spanId;
  req.traceparent = traceparent;

  // Pass-through tracestate if present
  if (req.headers['tracestate']) {
    res.setHeader('tracestate', req.headers['tracestate']);
  }

  next();
};

export default requestIdMiddleware;
