import { AgentToolCall, PolicyViolation } from './types';
export declare class GuardrailsEngine {
    /**
     * Check if a tool call is allowed based on:
     * 1. Tool is in the agent's allowed list
     * 2. Args don't match blocked patterns
     * 3. Budget is not exceeded
     */
    check(toolCall: AgentToolCall, allowedTools: string[], tokensUsed: number, budgetTokens?: number): PolicyViolation | null;
    /**
     * Sanitize tool output before injecting back into agent context.
     * Wraps output in XML tags to prevent prompt injection from tool results.
     */
    sanitizeToolOutput(toolName: string, output: unknown): string;
}
export declare const guardrails: GuardrailsEngine;
//# sourceMappingURL=guardrails.d.ts.map