import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import assessmentRoutes from './routes/assessment.routes.js';
import attemptRoutes from './routes/attempt.routes.js';

const log = logger.createLogger('assessment-service');

const app = express();

// Base parsing and security
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard shared tracing and request logger middlewares
app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

// Health and Probe Endpoints (Internal / Direct)
app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Assessment Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Assessment Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/assessments/health', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is healthy.' });
});

app.get('/api/v1/assessments/live', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is live.' });
});

app.get('/api/v1/assessments/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Assessment Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Assessment Service is ready.' });
});

app.get('/api/v1/assessments/', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Assessment Service is running.' });
});

// Domain Routes
app.use('/', assessmentRoutes);
app.use('/', attemptRoutes);

// Global error handler
app.use(middleware.errorHandler);

export default app;
