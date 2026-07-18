import { prisma } from './client';
import {
  Workflow,
  WorkflowVersion,
  WorkflowRun,
  RunEvent,
  RunEventType,
  RunStatus,
  HumanTask,
  HumanTaskStatus,
  Tenant,
  Prisma,
} from '@prisma/client';

// ─── Workflow Repository ───────────────────────────────────────────────────

export const workflowRepo = {
  findByTenant: (tenantId: string) =>
    prisma.workflow.findMany({
      where: { tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, tenantId: string) =>
    prisma.workflow.findFirst({
      where: { id, tenantId },
      include: { versions: { orderBy: { version: 'desc' } } },
    }),

  create: (data: Prisma.WorkflowCreateInput) =>
    prisma.workflow.create({ data }),

  update: (id: string, tenantId: string, data: Prisma.WorkflowUpdateInput) =>
    prisma.workflow.updateMany({ where: { id, tenantId }, data }),

  delete: (id: string, tenantId: string) =>
    prisma.workflow.deleteMany({ where: { id, tenantId } }),
};

// ─── Version Repository ────────────────────────────────────────────────────

export const versionRepo = {
  create: async (workflowId: string, definition: object): Promise<WorkflowVersion> => {
    const last = await prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });
    return prisma.workflowVersion.create({
      data: {
        workflowId,
        version: (last?.version ?? 0) + 1,
        definition: definition as Prisma.InputJsonValue,
      },
    });
  },

  publish: (id: string) =>
    prisma.workflowVersion.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    }),

  findById: (id: string) =>
    prisma.workflowVersion.findUnique({ where: { id } }),
};

// ─── Run Repository ────────────────────────────────────────────────────────

export const runRepo = {
  create: (data: Prisma.WorkflowRunCreateInput) =>
    prisma.workflowRun.create({ data }),

  findById: (id: string, tenantId: string) =>
    prisma.workflowRun.findFirst({ where: { id, tenantId } }),

  findByTenant: (tenantId: string, filters?: { status?: RunStatus; workflowId?: string }) =>
    prisma.workflowRun.findMany({
      where: { tenantId, ...filters },
      orderBy: { startedAt: 'desc' },
      take: 100,
    }),

  updateStatus: (id: string, status: RunStatus, extra?: Partial<Prisma.WorkflowRunUpdateInput>) =>
    prisma.workflowRun.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'
          ? { completedAt: new Date() }
          : {}),
        ...extra,
      },
    }),

  checkpoint: (id: string, currentNodeId: string, context: object) =>
    prisma.workflowRun.update({
      where: { id },
      data: {
        currentNodeId,
        context: context as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    }),

  // For worker crash recovery
  findStaleRunning: () =>
    prisma.workflowRun.findMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }, // stale > 5 min
      },
      include: { version: true },
    }),
};

// ─── Event Repository (append-only audit trail) ────────────────────────────

export const eventRepo = {
  append: (data: {
    runId: string;
    nodeId?: string;
    type: RunEventType;
    payload: object;
  }) =>
    prisma.runEvent.create({
      data: {
        runId: data.runId,
        nodeId: data.nodeId,
        type: data.type,
        payload: data.payload as Prisma.InputJsonValue,
      },
    }),

  findByRun: (runId: string) =>
    prisma.runEvent.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    }),
};

// ─── Human Task Repository ─────────────────────────────────────────────────

export const humanTaskRepo = {
  create: (data: Prisma.HumanTaskCreateInput) =>
    prisma.humanTask.create({ data }),

  findPending: (tenantId: string, userId?: string) =>
    prisma.humanTask.findMany({
      where: {
        status: 'PENDING',
        run: { tenantId },
        ...(userId ? { assignedTo: userId } : {}),
      },
      include: { run: { select: { workflowId: true, tenantId: true } } },
      orderBy: { createdAt: 'desc' },
    }),

  resolve: (id: string, status: HumanTaskStatus, response: object) =>
    prisma.humanTask.update({
      where: { id },
      data: { status, response: response as Prisma.InputJsonValue, resolvedAt: new Date() },
    }),

  findByRun: (runId: string) =>
    prisma.humanTask.findMany({ where: { runId } }),
};

// ─── Tenant Repository ─────────────────────────────────────────────────────

export const tenantRepo = {
  findById: (id: string): Promise<Tenant | null> =>
    prisma.tenant.findUnique({ where: { id } }),

  findByApiKey: (hash: string): Promise<Tenant | null> =>
    prisma.tenant.findUnique({ where: { apiKeyHash: hash } }),

  incrementTokenUsage: (id: string, tokens: number) =>
    prisma.tenant.update({
      where: { id },
      data: { llmUsedTokens: { increment: tokens } },
    }),

  create: (data: Prisma.TenantCreateInput): Promise<Tenant> =>
    prisma.tenant.create({ data }),
};

// ─── Token Usage Repository ────────────────────────────────────────────────

export const tokenUsageRepo = {
  record: (data: Prisma.TokenUsageCreateInput) =>
    prisma.tokenUsage.create({ data }),

  summaryByTenant: (tenantId: string, days = 30) =>
    prisma.tokenUsage.groupBy({
      by: ['model'],
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - days * 86400000) },
      },
      _sum: { totalTokens: true, costUsd: true },
    }),

  summaryByRun: (runId: string) =>
    prisma.tokenUsage.aggregate({
      where: { runId },
      _sum: { totalTokens: true, costUsd: true },
    }),
};
