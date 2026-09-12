import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { QueueManager } from './jobs/queue.manager';
import { prisma } from './database/prisma';

const app = createApp();

QueueManager.initialize();

const server = app.listen(env.PORT, () => {
  logger.info(`SICP Backend initialized on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await QueueManager.close();
    await prisma.$disconnect();
    logger.info('Database and queue connections closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Force quitting.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
