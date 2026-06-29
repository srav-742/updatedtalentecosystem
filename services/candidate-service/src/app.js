import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import candidateRoutes from './routes/candidate.routes.js';

const log = logger.createLogger('candidate-service');

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
  response.sendSuccess(res, { message: 'Candidate Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Candidate Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Candidate Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Candidate Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/candidates/health', (req, res) => {
  response.sendSuccess(res, { message: 'Candidate Service is healthy.' });
});

app.get('/api/v1/candidates/live', (req, res) => {
  response.sendSuccess(res, { message: 'Candidate Service is live.' });
});

app.get('/api/v1/candidates/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Candidate Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Candidate Service is ready.' });
});

app.get('/api/v1/candidates/', (req, res) => {
  response.sendSuccess(res, { message: 'Candidate Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Candidate Service is running.' });
});

// Domain Routes
app.use('/api/v1/candidates', candidateRoutes);

// Global error handler
app.use(middleware.errorHandler);

export default app;
