"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../observability/logger");
// Prevent multiple Prisma instances in dev (hot reload)
const prisma = global.__prisma ?? new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});
exports.prisma = prisma;
if (process.env.NODE_ENV === 'development') {
    global.__prisma = prisma;
}
// Set up query logging
prisma.$on('query', (e) => {
    logger_1.logger.debug(`Query: ${e.query}`, { duration: e.duration });
});
prisma.$on('error', (e) => {
    logger_1.logger.error(`Database Error: ${e.message}`, { target: e.target });
});
//# sourceMappingURL=client.js.map