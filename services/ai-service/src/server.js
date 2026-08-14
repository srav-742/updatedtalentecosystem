import mongoose from 'mongoose';
import app from './app.js';
import environment from './config/environment.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('ai-service');
const port = environment.PORT || environment.port || 5016;

const startServer = async () => {
  try {
    await mongoose.connect(environment.MONGO_URI);
    const server = app.listen(port, () => log.info(`AI Service listening on port ${port}`));

    const shutdown = (signal) => {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    log.error('Failed to start AI Service:', error);
    process.exit(1);
  }
};

startServer();
