/**
 * @fileoverview Express Application Assembly
 * @module app
 *
 * Constructs the Express application and wires up the middleware pipeline
 * for the Auth Service.
 */

import express from 'express';
import cors from 'cors';

// Config
import environment from './config/environment.js';

// Middlewares
import requestLogger from './middlewares/requestLogger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';

/** Create the Express application instance */
const app = express();

// ─── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: environment.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Disable X-Powered-By header for basic security obfuscation
app.disable('x-powered-by');

// ─── Body Parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '2MB' }));
app.use(express.urlencoded({ extended: true, limit: '2MB' }));

// ─── Favicon Handler ───────────────────────────────────────────────
// Prevents browser favicon requests from cluttering logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─── Request Logger ────────────────────────────────────────────────
app.use(requestLogger);

// ─── Routes ────────────────────────────────────────────────────────
app.use(routes);

// ─── 404 Catch-All ─────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ──────────────────────────────────────────
app.use(errorHandler);

export default app;
/** export app for testability */
export { app };
// Trigger nodemon reload now that port 5001 is free

