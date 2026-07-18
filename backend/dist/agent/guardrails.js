"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardrails = exports.GuardrailsEngine = void 0;
const logger_1 = require("../observability/logger");
// Blocked argument patterns — these are enforced in code, not via prompt
const BLOCKED_ARG_PATTERNS = [
    // SQL injection in any string argument
    { pattern: /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE)\s/i, reason: 'Potential SQL injection' },
    // Prompt injection attempt — model trying to override instructions
    { pattern: /ignore previous instructions/i, reason: 'Prompt injection attempt detected' },
    { pattern: /you are now/i, reason: 'Role hijack attempt detected' },
];
// Tools that require explicit tenant allow-list
const HIGH_RISK_TOOLS = new Set(['sql_query', 'code_execute', 'http_request']);
class GuardrailsEngine {
    /**
     * Check if a tool call is allowed based on:
     * 1. Tool is in the agent's allowed list
     * 2. Args don't match blocked patterns
     * 3. Budget is not exceeded
     */
    check(toolCall, allowedTools, tokensUsed, budgetTokens) {
        // 1. Tool allow-list
        if (!allowedTools.includes(toolCall.name)) {
            logger_1.logger.warn('Policy violation: disallowed tool', { tool: toolCall.name, allowed: allowedTools });
            return {
                type: 'DISALLOWED_TOOL',
                message: `Tool '${toolCall.name}' is not in the allowed list for this agent step`,
            };
        }
        // 2. Budget check
        if (budgetTokens && tokensUsed >= budgetTokens) {
            logger_1.logger.warn('Policy violation: budget exceeded', { tokensUsed, budgetTokens });
            return {
                type: 'BUDGET_EXCEEDED',
                message: `Token budget of ${budgetTokens} exceeded (used: ${tokensUsed})`,
            };
        }
        // 3. Argument pattern checks
        const argsStr = JSON.stringify(toolCall.args);
        for (const { pattern, reason } of BLOCKED_ARG_PATTERNS) {
            if (pattern.test(argsStr)) {
                logger_1.logger.warn('Policy violation: blocked argument pattern', { tool: toolCall.name, reason });
                return {
                    type: 'DISALLOWED_ARGS',
                    message: `Blocked argument pattern detected: ${reason}`,
                };
            }
        }
        // 4. High-risk tool: warn but allow (tenant has already allow-listed it)
        if (HIGH_RISK_TOOLS.has(toolCall.name)) {
            logger_1.logger.info('High-risk tool call allowed', { tool: toolCall.name });
        }
        return null; // Allowed
    }
    /**
     * Sanitize tool output before injecting back into agent context.
     * Wraps output in XML tags to prevent prompt injection from tool results.
     */
    sanitizeToolOutput(toolName, output) {
        const raw = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        // Wrap in XML tags — the system prompt instructs the model that
        // <tool_result> content is DATA only, never instructions
        return `<tool_result name="${toolName}">\n${raw}\n</tool_result>`;
    }
}
exports.GuardrailsEngine = GuardrailsEngine;
exports.guardrails = new GuardrailsEngine();
//# sourceMappingURL=guardrails.js.map