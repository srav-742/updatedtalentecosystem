/**
 * @fileoverview Base HTTP Client
 * @module gateway/clients/base.client
 *
 * Axios-based HTTP client with retry logic, timeout configuration,
 * and automatic correlation ID forwarding. All service clients
 * extend this base.
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import environment from '../../core/config/environment.js';
import contextStore from '../../core/context/contextStore.js';
import HEADERS from '../../core/constants/headers.js';
import logger from '../../core/logger/logger.js';

/**
 * Creates a configured Axios instance for communicating with a downstream service.
 *
 * @param {string} baseURL - The base URL of the target service.
 * @param {Object} [options={}] - Additional Axios config options.
 * @returns {import('axios').AxiosInstance} Configured Axios instance.
 */
export const createClient = (baseURL, options = {}) => {
  const client = axios.create({
    baseURL,
    timeout: environment.timeouts.proxy,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  });

  // ─── Request Interceptor: Inject Tracing Headers ────
  client.interceptors.request.use(
    (config) => {
      const ctx = contextStore.getContext();

      if (ctx?.requestId) {
        config.headers[HEADERS.REQUEST_ID] = ctx.requestId;
      }
      if (ctx?.correlationId) {
        config.headers[HEADERS.CORRELATION_ID] = ctx.correlationId;
      }
      if (ctx?.user?.id) {
        config.headers[HEADERS.USER_ID] = ctx.user.id;
      }

      logger.debug(`HTTP Client → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        source: 'base.client',
      });

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // ─── Response Interceptor: Log Responses ────────────
  client.interceptors.response.use(
    (response) => {
      logger.debug(
        `HTTP Client ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
        { source: 'base.client' }
      );
      return response;
    },
    (error) => {
      const status = error.response?.status || 'N/A';
      const url = error.config?.url || 'unknown';
      logger.error(`HTTP Client Error: ${status} ${url} — ${error.message}`, {
        source: 'base.client',
      });
      return Promise.reject(error);
    }
  );

  // ─── Retry Configuration ───────────────────────────
  axiosRetry(client, {
    retries: 2,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Retry on network errors and 5xx responses (except 501)
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response && error.response.status >= 500 && error.response.status !== 501)
      );
    },
    onRetry: (retryCount, error, config) => {
      logger.warn(
        `HTTP Client Retry #${retryCount}: ${config.method?.toUpperCase()} ${config.url} — ${error.message}`,
        { source: 'base.client' }
      );
    },
  });

  return client;
};

export default { createClient };
