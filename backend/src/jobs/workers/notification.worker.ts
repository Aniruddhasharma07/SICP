import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';

export function startNotificationWorker(connection: unknown): Worker | null {
  if (!connection) return null;

  const worker = new Worker(
    'system-notifications',
    async (job: Job) => {
      const { recipientId, title, message, type, actionUrl } = job.data;
      await prisma.notification.create({
        data: {
          recipientId,
          title,
          message,
          type,
          actionUrl: actionUrl || null,
        },
      });
      logger.info(`Dispatched notification to user ${recipientId}: "${title}"`);
    },
    { connection: connection as any }
  );

  return worker;
}
