import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import recruiterRoutes from './routes/recruiter.routes.js';

const log = logger.createLogger('recruiter-service');

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
  response.sendSuccess(res, { message: 'Recruiter Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Recruiter Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Recruiter Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Recruiter Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/recruiters/health', (req, res) => {
  response.sendSuccess(res, { message: 'Recruiter Service is healthy.' });
});

app.get('/api/v1/recruiters/live', (req, res) => {
  response.sendSuccess(res, { message: 'Recruiter Service is live.' });
});

app.get('/api/v1/recruiters/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Recruiter Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Recruiter Service is ready.' });
});

app.get('/api/v1/recruiters/', (req, res) => {
  response.sendSuccess(res, { message: 'Recruiter Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Recruiter Service is running.' });
});

// Domain Routes
// Recruiter routes will handle profiles, organizations, and subscription under the unified router
app.use('/', recruiterRoutes);

// Global error handler
app.use(middleware.errorHandler);

export default app;
