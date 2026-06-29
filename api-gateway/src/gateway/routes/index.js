/**
 * @fileoverview Route Index — Dynamic Router Assembly
 * @module gateway/routes/index
 *
 * Loops through the Route Registry to dynamically mount Express routes.
 * Configures body limits, rate limits, timeouts, and proxies per-route.
 */

import { Router } from 'express';
import express from 'express';
import { routeRegistry } from './routeRegistry.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import policyMiddleware from '../middlewares/policy.middleware.js';
import freezeContextMiddleware from '../middlewares/freezeContext.middleware.js';
import { createRouteLimiter } from '../middlewares/rateLimiter.middleware.js';
import createTimeoutMiddleware from '../middlewares/timeout.middleware.js';
import { createProxyMiddleware } from '../proxy/proxyFactory.js';
import logger from '../../core/logger/logger.js';

const router = Router();

routeRegistry.forEach((route) => {
  const method = route.method.toLowerCase();
  const middlewares = [];

  // ─── 1. Route-Specific Body Limits ───────────────────
  if (['post', 'put', 'patch', 'delete'].includes(method) || route.method === '*') {
    const limit = route.bodyLimit || '2MB';
    middlewares.push(express.json({ limit }));
    middlewares.push(express.urlencoded({ extended: true, limit }));
  }

  // ─── 2. Route-Specific Rate Limiters ─────────────────
  if (route.rateLimit === 'strict') {
    middlewares.push(createRouteLimiter({ max: 30, windowMs: 60000 }));
  }

  // ─── 3. Authentication Middleware ────────────────────
  if (route.authRequired) {
    middlewares.push(authMiddleware);
  }

  // ─── 4. Pluggable Policy Middleware ──────────────────
  if (route.policies && route.policies.length > 0) {
    middlewares.push(policyMiddleware);
  }

  // ─── 5. Freeze Request Context ───────────────────────
  middlewares.push(freezeContextMiddleware);

  // ─── 6. Timeout Middleware ───────────────────────────
  if (route.timeout && route.timeout.gateway) {
    middlewares.push(createTimeoutMiddleware(route.timeout.gateway));
  }

  // ─── 7. Circuit Breaker & Proxy Handler ──────────────
  const proxyOpts = {};
  if (route.timeout && route.timeout.downstream) {
    proxyOpts.timeout = route.timeout.downstream;
    proxyOpts.proxyTimeout = route.timeout.downstream;
  }

  const proxyHandler = createProxyMiddleware(route.serviceKey, proxyOpts);

  // Mount route in Express router
  if (method === '*') {
    router.all(route.path, ...middlewares, proxyHandler);
  } else {
    router[method](route.path, ...middlewares, proxyHandler);
  }

  logger.info(
    `Mounted dynamic route: [${route.method}] ${route.path} ` +
    `→ ${route.serviceKey} (Auth: ${route.authRequired}, ` +
    `Limit: ${route.bodyLimit}, Timeout: G:${route.timeout.gateway}/D:${route.timeout.downstream})`
  );
});

export default router;
