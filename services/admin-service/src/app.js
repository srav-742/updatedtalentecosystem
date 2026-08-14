import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import adminRoutes from './routes/admin.routes.js';

const log = logger.createLogger('admin-service');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

// Health and Probe Endpoints (Internal / Direct)
app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is live.' });
});

app.get('/ready', (req, res) => {
  const isReady = process.env.NODE_ENV === 'testing' || mongoose.connection.readyState === 1;
  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Admin Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'Admin Service is ready.' });
});

// Health and Probe Endpoints (Versioned / Gateway Proxied)
app.get('/api/v1/admin/health', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is healthy.' });
});

app.get('/api/v1/admin/live', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is live.' });
});

app.get('/api/v1/admin/ready', (req, res) => {
  const isReady = process.env.NODE_ENV === 'testing' || mongoose.connection.readyState === 1;
  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Admin Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'Admin Service is ready.' });
});

app.get('/api/v1/admin/', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is running.' });
});

// Root Endpoint (Public status checking)
app.get('/', (req, res) => {
  response.sendSuccess(res, { message: 'Admin Service is running.' });
});

app.use('/api/v1/admin', adminRoutes);

app.use(middleware.errorHandler);

export default app;
