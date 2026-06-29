import mongoose from 'mongoose';
import app from './app.js';
import environment from './config/environment.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('job-service');
const port = environment.port;

const startServer = async () => {
  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(environment.MONGO_URI);
    log.info('✔ MongoDB connection established successfully.');

    const server = app.listen(port, () => {
      log.info('=====================================================');
      log.info(`✔ Job Service listening on port ${port}`);
      log.info(`   Local:   http://localhost:${port}`);
      log.info(`   Health:  http://localhost:${port}/health`);
      log.info(`   Ready:   http://localhost:${port}/ready`);
      log.info(`   Live:    http://localhost:${port}/live`);
      log.info('=====================================================');
    });

    const shutdown = (signal) => {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        log.info('HTTP server closed.');
        try {
          await mongoose.connection.close();
          log.info('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          log.error('Error during database shutdown:', err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        log.error('Force shutting down due to shutdown timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
