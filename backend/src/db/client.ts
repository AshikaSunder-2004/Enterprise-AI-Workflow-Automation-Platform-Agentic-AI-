import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple Prisma instances in dev (hot reload)
const prisma = global.__prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

// Set up query logging
prisma.$on('query' as never, (e: any) => {
  logger.debug(`Query: ${e.query}`, { duration: e.duration });
});

prisma.$on('error' as never, (e: any) => {
  logger.error(`Database Error: ${e.message}`, { target: e.target });
});

export { prisma };
