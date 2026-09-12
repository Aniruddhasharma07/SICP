import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error Prisma event types
  prisma.$on('query', (e: { query: string; params: string; duration: number }) => {
    logger.debug(`Prisma Query: ${e.query} (${e.duration}ms)`);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
