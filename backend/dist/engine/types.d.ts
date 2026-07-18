export type NodeType = 'agent' | 'tool' | 'human' | 'branch' | 'parallel' | 'loop' | 'subworkflow' | 'start' | 'end';
export interface BaseNode {
    id: string;
    type: NodeType;
    label: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    idempotencyKey?: string;
}
export interface AgentNodeConfig extends BaseNode {
    type: 'agent';
    goal: string;
    allowedTools: string[];
    maxIterations: number;
    budgetTokens?: number;
    agentType?: string;
    systemPrompt?: string;
    outputKey: string;
}
export interface ToolNodeConfig extends BaseNode {
    type: 'tool';
    toolName: string;
    inputMapping: Record<string, unknown>;
    outputKey: string;
}
export interface HumanNodeConfig extends BaseNode {
    type: 'human';
    prompt: string;
    assignTo?: string;
    outputKey: string;
    timeoutAction?: 'fail' | 'skip';
}
export interface BranchNodeConfig extends BaseNode {
    type: 'branch';
    conditions: Array<{
        id: string;
        expression: string;
        targetNodeId: string;
    }>;
    defaultTargetNodeId: string;
}
export interface ParallelNodeConfig extends BaseNode {
    type: 'parallel';
    branches: string[][];
    joinStrategy: 'wait_all' | 'wait_first';
}
export interface LoopNodeConfig extends BaseNode {
    type: 'loop';
    bodyNodeIds: string[];
    exitCondition: string;
    maxIterations: number;
    iterationCountKey: string;
}
export interface SubworkflowNodeConfig extends BaseNode {
    type: 'subworkflow';
    workflowId: string;
    versionId?: string;
    inputMapping: Record<string, unknown>;
    outputKey: string;
}
export interface StartNodeConfig extends BaseNode {
    type: 'start';
}
export interface EndNodeConfig extends BaseNode {
    type: 'end';
}
export type NodeConfig = AgentNodeConfig | ToolNodeConfig | HumanNodeConfig | BranchNodeConfig | ParallelNodeConfig | LoopNodeConfig | SubworkflowNodeConfig | StartNodeConfig | EndNodeConfig;
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
}
export interface WorkflowDefinition {
    nodes: NodeConfig[];
    edges: WorkflowEdge[];
    variables?: Record<string, unknown>;
}
export interface ExecutionContext {
    runId: string;
    tenantId: string;
    workflowId: string;
    triggerPayload: unknown;
    variables: Record<string, unknown>;
    iteration?: number;
}
export type NodeResult = {
    status: 'completed';
    output: unknown;
    nextNodeId?: string;
} | {
    status: 'waiting_human';
    taskId: string;
} | {
    status: 'failed';
    error: string;
    retryable: boolean;
} | {
    status: 'branched';
    nextNodeId: string;
} | {
    status: 'parallel_done';
    outputs: Record<string, unknown>;
};
export type ErrorType = 'VALIDATION_ERROR' | 'TOOL_FAILURE' | 'TIMEOUT' | 'BUDGET_EXCEEDED' | 'POLICY_VIOLATION' | 'AGENT_MAX_ITERATIONS' | 'SCHEMA_VALIDATION' | 'NETWORK_ERROR' | 'HUMAN_REJECTED' | 'WORKFLOW_NOT_FOUND' | 'INTERNAL_ERROR';
export declare class WorkflowError extends Error {
    readonly type: ErrorType;
    readonly retryable: boolean;
    readonly details?: unknown | undefined;
    constructor(type: ErrorType, message: string, retryable?: boolean, details?: unknown | undefined);
}
//# sourceMappingURL=types.d.ts.map