import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import aiRoutes from './routes/ai.routes.js';

const log = logger.createLogger('ai-service');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'AI Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'AI Service is live.' });
});

app.get('/ready', (req, res) => {
  const isReady = process.env.NODE_ENV === 'testing' || mongoose.connection.readyState === 1;
  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'AI Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'AI Service is ready.' });
});

app.use('/api/v1/ai', aiRoutes);

app.use(middleware.errorHandler);

export default app;
