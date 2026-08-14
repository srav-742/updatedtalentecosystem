import mongoose from 'mongoose';
import app from './app.js';
import environment from './config/environment.js';
import { logger } from '@hire1percent/shared';
import { initializeWebSocket } from './websocket/wsServer.js';
import { startQueueWorker, stopQueueWorker } from './workers/queueWorker.js';
import { subscribeToEvents } from './events/listeners.js';
import { seedNotificationTemplates } from './utils/seedTemplates.js';

const log = logger.createLogger('notification-service');
const port = environment.port;

const startServer = async () => {
  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(environment.MONGO_URI);
    log.info('✔ MongoDB connection established successfully.');
    
    // Seed default templates
    await seedNotificationTemplates();

    const server = app.listen(port, () => {
      log.info('=====================================================');
      log.info(`✔ Notification Service listening on port ${port}`);
      log.info(`   Local:   http://localhost:${port}`);
      log.info('=====================================================');
    });

    // 1. Initialize WebSocket Server
    initializeWebSocket(server);
    log.info('✔ WebSocket Server initialized and bound.');

    // 2. Start Background Queue/Retry Worker
    startQueueWorker();
    log.info('✔ Notification Queue background worker started.');

    // 3. Register Event Bus Listeners
    subscribeToEvents();

    const shutdown = (signal) => {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      
      // Stop background worker
      stopQueueWorker();

      server.close(async () => {
        log.info('HTTP & WebSocket server closed.');
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
