import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { middleware, logger, response } from '@hire1percent/shared';
import searchRoutes from './routes/search.routes.js';
import indexRoutes from './routes/index.routes.js';

const log = logger.createLogger('search-service');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(middleware.correlationMiddleware);
app.use(middleware.contextMiddleware);
app.use(middleware.requestLogger(log));

app.get('/health', (req, res) => {
  response.sendSuccess(res, { message: 'Search Service is healthy.' });
});

app.get('/live', (req, res) => {
  response.sendSuccess(res, { message: 'Search Service is live.' });
});

app.get('/ready', (req, res) => {
  const isReady = process.env.NODE_ENV === 'testing' || mongoose.connection.readyState === 1;
  if (!isReady) {
    return res.status(503).json({
      success: false,
      status: 503,
      message: 'Search Service is not ready (Database connection down).',
      timestamp: new Date().toISOString(),
    });
  }
  response.sendSuccess(res, { message: 'Search Service is ready.' });
});

app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/index', indexRoutes);

app.use(middleware.errorHandler);

export default app;
