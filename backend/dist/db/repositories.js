"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenUsageRepo = exports.tenantRepo = exports.humanTaskRepo = exports.eventRepo = exports.runRepo = exports.versionRepo = exports.workflowRepo = void 0;
const client_1 = require("./client");
// ─── Workflow Repository ───────────────────────────────────────────────────
exports.workflowRepo = {
    findByTenant: (tenantId) => client_1.prisma.workflow.findMany({
        where: { tenantId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
    }),
    findById: (id, tenantId) => client_1.prisma.workflow.findFirst({
        where: { id, tenantId },
        include: { versions: { orderBy: { version: 'desc' } } },
    }),
    create: (data) => client_1.prisma.workflow.create({ data }),
    update: (id, tenantId, data) => client_1.prisma.workflow.updateMany({ where: { id, tenantId }, data }),
    delete: (id, tenantId) => client_1.prisma.workflow.deleteMany({ where: { id, tenantId } }),
};
// ─── Version Repository ────────────────────────────────────────────────────
exports.versionRepo = {
    create: async (workflowId, definition) => {
        const last = await client_1.prisma.workflowVersion.findFirst({
            where: { workflowId },
            orderBy: { version: 'desc' },
        });
        return client_1.prisma.workflowVersion.create({
            data: {
                workflowId,
                version: (last?.version ?? 0) + 1,
                definition: definition,
            },
        });
    },
    publish: (id) => client_1.prisma.workflowVersion.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
    }),
    findById: (id) => client_1.prisma.workflowVersion.findUnique({ where: { id } }),
};
// ─── Run Repository ────────────────────────────────────────────────────────
exports.runRepo = {
    create: (data) => client_1.prisma.workflowRun.create({ data }),
    findById: (id, tenantId) => client_1.prisma.workflowRun.findFirst({ where: { id, tenantId } }),
    findByTenant: (tenantId, filters) => client_1.prisma.workflowRun.findMany({
        where: { tenantId, ...filters },
        orderBy: { startedAt: 'desc' },
        take: 100,
    }),
    updateStatus: (id, status, extra) => client_1.prisma.workflowRun.update({
        where: { id },
        data: {
            status,
            ...(status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'
                ? { completedAt: new Date() }
                : {}),
            ...extra,
        },
    }),
    checkpoint: (id, currentNodeId, context) => client_1.prisma.workflowRun.update({
        where: { id },
        data: {
            currentNodeId,
            context: context,
            updatedAt: new Date(),
        },
    }),
    // For worker crash recovery
    findStaleRunning: () => client_1.prisma.workflowRun.findMany({
        where: {
            status: 'RUNNING',
            updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // stale > 5 min
        },
        include: { version: true },
    }),
};
// ─── Event Repository (append-only audit trail) ────────────────────────────
exports.eventRepo = {
    append: (data) => client_1.prisma.runEvent.create({
        data: {
            runId: data.runId,
            nodeId: data.nodeId,
            type: data.type,
            payload: data.payload,
        },
    }),
    findByRun: (runId) => client_1.prisma.runEvent.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
    }),
};
// ─── Human Task Repository ─────────────────────────────────────────────────
exports.humanTaskRepo = {
    create: (data) => client_1.prisma.humanTask.create({ data }),
    findPending: (tenantId, userId) => client_1.prisma.humanTask.findMany({
        where: {
            status: 'PENDING',
            run: { tenantId },
            ...(userId ? { assignedTo: userId } : {}),
        },
        include: { run: { select: { workflowId: true, tenantId: true } } },
        orderBy: { createdAt: 'desc' },
    }),
    resolve: (id, status, response) => client_1.prisma.humanTask.update({
        where: { id },
        data: { status, response: response, resolvedAt: new Date() },
    }),
    findByRun: (runId) => client_1.prisma.humanTask.findMany({ where: { runId } }),
};
// ─── Tenant Repository ─────────────────────────────────────────────────────
exports.tenantRepo = {
    findById: (id) => client_1.prisma.tenant.findUnique({ where: { id } }),
    findByApiKey: (hash) => client_1.prisma.tenant.findUnique({ where: { apiKeyHash: hash } }),
    incrementTokenUsage: (id, tokens) => client_1.prisma.tenant.update({
        where: { id },
        data: { llmUsedTokens: { increment: tokens } },
    }),
    create: (data) => client_1.prisma.tenant.create({ data }),
};
// ─── Token Usage Repository ────────────────────────────────────────────────
exports.tokenUsageRepo = {
    record: (data) => client_1.prisma.tokenUsage.create({ data }),
    summaryByTenant: (tenantId, days = 30) => client_1.prisma.tokenUsage.groupBy({
        by: ['model'],
        where: {
            tenantId,
            createdAt: { gte: new Date(Date.now() - days * 86400000) },
        },
        _sum: { totalTokens: true, costUsd: true },
    }),
    summaryByRun: (runId) => client_1.prisma.tokenUsage.aggregate({
        where: { runId },
        _sum: { totalTokens: true, costUsd: true },
    }),
};
//# sourceMappingURL=repositories.js.map