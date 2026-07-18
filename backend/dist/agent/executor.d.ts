import { AgentRunConfig, AgentRunResult } from './types';
/**
 * ReAct-style planner-executor loop for Agent nodes.
 * Persists every reasoning/tool-call/result triple as immutable RunEvent.
 */
export declare function runAgentExecutor(cfg: AgentRunConfig): Promise<AgentRunResult>;
//# sourceMappingURL=executor.d.ts.map