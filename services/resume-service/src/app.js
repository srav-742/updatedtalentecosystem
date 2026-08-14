import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import resumeRoutes from './routes/resume.routes.js';

const log = logger.createLogger('resume-service');

const app = express();

// Base parsing and security
app.use(helmet());
app.use(cors());
// We support standard json and urlencoded parsers for endpoints except the upload stream itself
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard shared tracing and request logger middlewares
app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

// Health and Probe Endpoints (Internal / Direct)
app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Resume Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Resume Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/resumes/health', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is healthy.' });
});

app.get('/api/v1/resumes/live', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is live.' });
});

app.get('/api/v1/resumes/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Resume Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Resume Service is ready.' });
});

app.get('/api/v1/resumes/', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Resume Service is running.' });
});

// Domain Routes
app.use('/', resumeRoutes);

// Global error handler
app.use(middleware.errorHandler);

export default app;
