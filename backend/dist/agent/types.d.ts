export type AgentMessageRole = 'user' | 'model' | 'tool';
export interface AgentMessage {
    role: AgentMessageRole;
    content: string | AgentToolCall[] | AgentToolResult[];
}
export interface AgentToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
}
export interface AgentToolResult {
    toolCallId: string;
    result: unknown;
    error?: string;
}
export interface AgentRunConfig {
    runId: string;
    nodeId: string;
    tenantId: string;
    goal: string;
    context: Record<string, unknown>;
    allowedTools: string[];
    maxIterations: number;
    budgetTokens?: number;
    systemPrompt?: string;
}
export interface AgentRunResult {
    status: 'completed' | 'max_iterations' | 'budget_exceeded' | 'human_escalation' | 'error';
    output?: unknown;
    reasoning?: string;
    iterationsUsed: number;
    tokensUsed: number;
    humanEscalationReason?: string;
}
export interface PolicyViolation {
    type: 'DISALLOWED_TOOL' | 'DISALLOWED_ARGS' | 'RATE_LIMIT' | 'BUDGET_EXCEEDED';
    message: string;
}
//# sourceMappingURL=types.d.ts.map