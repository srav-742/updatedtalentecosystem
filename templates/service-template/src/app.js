import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';

const log = logger.createLogger('service-template');

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

// Health and Probe Endpoints
app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Service is live.' });
});

app.get('/ready', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const isReady = mongoStatus === 1;

  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }

  response.sendSuccess(res, { message: 'Service is ready.' });
});

// Global error handler
app.use(middleware.errorHandler);

export default app;
