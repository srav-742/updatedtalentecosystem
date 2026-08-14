import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import notificationRoutes from './routes/notification.routes.js';

const log = logger.createLogger('notification-service');

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
  response.sendSuccess(res, { message: 'Notification Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Notification Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Notification Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Notification Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/notifications/health', (req, res) => {
  response.sendSuccess(res, { message: 'Notification Service is healthy.' });
});

app.get('/api/v1/notifications/live', (req, res) => {
  response.sendSuccess(res, { message: 'Notification Service is live.' });
});

app.get('/api/v1/notifications/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Notification Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Notification Service is ready.' });
});

app.get('/api/v1/notifications/', (req, res) => {
  response.sendSuccess(res, { message: 'Notification Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Notification Service is running.' });
});

// Domain Routes
app.use('/', notificationRoutes);

// Global error handler
app.use(middleware.errorHandler);

export default app;
