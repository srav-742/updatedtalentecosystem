import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import jobRoutes from './routes/job.routes.js';

const log = logger.createLogger('job-service');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

// Health Probes (Internal / Direct)
app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  if (mongoStatus !== 1) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'Job Service is ready.' });
});

// Health Probes (Versioned / Gateway Proxied)
app.get('/api/v1/jobs/health', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is healthy.' });
});

app.get('/api/v1/jobs/live', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is live.' });
});

app.get('/api/v1/jobs/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  if (mongoStatus !== 1) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'Job Service is ready.' });
});

app.get('/api/v1/jobs/', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Job Service is running.' });
});

// Domain Routes
app.use('/api/v1/jobs', jobRoutes);

// Global Error Handler
app.use(middleware.errorHandler);

export default app;
