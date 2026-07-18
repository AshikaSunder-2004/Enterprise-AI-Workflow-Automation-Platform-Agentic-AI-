import { WorkflowVersion, RunEventType, RunStatus, HumanTaskStatus, Tenant, Prisma } from '@prisma/client';
export declare const workflowRepo: {
    findByTenant: (tenantId: string) => Prisma.PrismaPromise<({
        versions: {
            status: import(".prisma/client").$Enums.VersionStatus;
            id: string;
            workflowId: string;
            version: number;
            definition: Prisma.JsonValue;
            createdAt: Date;
            publishedAt: Date | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        triggerType: import(".prisma/client").$Enums.TriggerType;
        triggerConfig: Prisma.JsonValue | null;
        currentVersionId: string | null;
    })[]>;
    findById: (id: string, tenantId: string) => Prisma.Prisma__WorkflowClient<({
        versions: {
            status: import(".prisma/client").$Enums.VersionStatus;
            id: string;
            workflowId: string;
            version: number;
            definition: Prisma.JsonValue;
            createdAt: Date;
            publishedAt: Date | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        triggerType: import(".prisma/client").$Enums.TriggerType;
        triggerConfig: Prisma.JsonValue | null;
        currentVersionId: string | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create: (data: Prisma.WorkflowCreateInput) => Prisma.Prisma__WorkflowClient<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        triggerType: import(".prisma/client").$Enums.TriggerType;
        triggerConfig: Prisma.JsonValue | null;
        currentVersionId: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update: (id: string, tenantId: string, data: Prisma.WorkflowUpdateInput) => Prisma.PrismaPromise<Prisma.BatchPayload>;
    delete: (id: string, tenantId: string) => Prisma.PrismaPromise<Prisma.BatchPayload>;
};
export declare const versionRepo: {
    create: (workflowId: string, definition: object) => Promise<WorkflowVersion>;
    publish: (id: string) => Prisma.Prisma__WorkflowVersionClient<{
        status: import(".prisma/client").$Enums.VersionStatus;
        id: string;
        workflowId: string;
        version: number;
        definition: Prisma.JsonValue;
        createdAt: Date;
        publishedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findById: (id: string) => Prisma.Prisma__WorkflowVersionClient<{
        status: import(".prisma/client").$Enums.VersionStatus;
        id: string;
        workflowId: string;
        version: number;
        definition: Prisma.JsonValue;
        createdAt: Date;
        publishedAt: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
};
export declare const runRepo: {
    create: (data: Prisma.WorkflowRunCreateInput) => Prisma.Prisma__WorkflowRunClient<{
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findById: (id: string, tenantId: string) => Prisma.Prisma__WorkflowRunClient<{
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    findByTenant: (tenantId: string, filters?: {
        status?: RunStatus;
        workflowId?: string;
    }) => Prisma.PrismaPromise<{
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    }[]>;
    updateStatus: (id: string, status: RunStatus, extra?: Partial<Prisma.WorkflowRunUpdateInput>) => Prisma.Prisma__WorkflowRunClient<{
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    checkpoint: (id: string, currentNodeId: string, context: object) => Prisma.Prisma__WorkflowRunClient<{
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findStaleRunning: () => Prisma.PrismaPromise<({
        version: {
            status: import(".prisma/client").$Enums.VersionStatus;
            id: string;
            workflowId: string;
            version: number;
            definition: Prisma.JsonValue;
            createdAt: Date;
            publishedAt: Date | null;
        };
    } & {
        status: import(".prisma/client").$Enums.RunStatus;
        id: string;
        workflowId: string;
        updatedAt: Date;
        tenantId: string;
        currentNodeId: string | null;
        context: Prisma.JsonValue;
        triggerPayload: Prisma.JsonValue | null;
        errorMessage: string | null;
        startedAt: Date;
        completedAt: Date | null;
        versionId: string;
    })[]>;
};
export declare const eventRepo: {
    append: (data: {
        runId: string;
        nodeId?: string;
        type: RunEventType;
        payload: object;
    }) => Prisma.Prisma__RunEventClient<{
        type: import(".prisma/client").$Enums.RunEventType;
        id: string;
        createdAt: Date;
        nodeId: string | null;
        payload: Prisma.JsonValue;
        runId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findByRun: (runId: string) => Prisma.PrismaPromise<{
        type: import(".prisma/client").$Enums.RunEventType;
        id: string;
        createdAt: Date;
        nodeId: string | null;
        payload: Prisma.JsonValue;
        runId: string;
    }[]>;
};
export declare const humanTaskRepo: {
    create: (data: Prisma.HumanTaskCreateInput) => Prisma.Prisma__HumanTaskClient<{
        status: import(".prisma/client").$Enums.HumanTaskStatus;
        id: string;
        createdAt: Date;
        context: Prisma.JsonValue | null;
        nodeId: string;
        runId: string;
        prompt: string;
        response: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        assignedTo: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findPending: (tenantId: string, userId?: string) => Prisma.PrismaPromise<({
        run: {
            workflowId: string;
            tenantId: string;
        };
    } & {
        status: import(".prisma/client").$Enums.HumanTaskStatus;
        id: string;
        createdAt: Date;
        context: Prisma.JsonValue | null;
        nodeId: string;
        runId: string;
        prompt: string;
        response: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        assignedTo: string | null;
    })[]>;
    resolve: (id: string, status: HumanTaskStatus, response: object) => Prisma.Prisma__HumanTaskClient<{
        status: import(".prisma/client").$Enums.HumanTaskStatus;
        id: string;
        createdAt: Date;
        context: Prisma.JsonValue | null;
        nodeId: string;
        runId: string;
        prompt: string;
        response: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        assignedTo: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findByRun: (runId: string) => Prisma.PrismaPromise<{
        status: import(".prisma/client").$Enums.HumanTaskStatus;
        id: string;
        createdAt: Date;
        context: Prisma.JsonValue | null;
        nodeId: string;
        runId: string;
        prompt: string;
        response: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        assignedTo: string | null;
    }[]>;
};
export declare const tenantRepo: {
    findById: (id: string) => Promise<Tenant | null>;
    findByApiKey: (hash: string) => Promise<Tenant | null>;
    incrementTokenUsage: (id: string, tokens: number) => Prisma.Prisma__TenantClient<{
        name: string;
        id: string;
        createdAt: Date;
        plan: string;
        llmBudgetTokens: bigint;
        llmUsedTokens: bigint;
        apiKeyHash: string | null;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    create: (data: Prisma.TenantCreateInput) => Promise<Tenant>;
};
export declare const tokenUsageRepo: {
    record: (data: Prisma.TokenUsageCreateInput) => Prisma.Prisma__TokenUsageClient<{
        model: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        runId: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: Prisma.Decimal;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    summaryByTenant: (tenantId: string, days?: number) => Prisma.GetTokenUsageGroupByPayload<{
        by: "model"[];
        where: {
            tenantId: string;
            createdAt: {
                gte: Date;
            };
        };
        _sum: {
            totalTokens: true;
            costUsd: true;
        };
    }>;
    summaryByRun: (runId: string) => Prisma.PrismaPromise<Prisma.GetTokenUsageAggregateType<{
        where: {
            runId: string;
        };
        _sum: {
            totalTokens: true;
            costUsd: true;
        };
    }>>;
};
//# sourceMappingURL=repositories.d.ts.map