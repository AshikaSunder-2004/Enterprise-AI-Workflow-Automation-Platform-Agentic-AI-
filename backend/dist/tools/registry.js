"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
const ajv_1 = __importDefault(require("ajv"));
const interface_1 = require("./interface");
const logger_1 = require("../observability/logger");
// Rate limiter per (toolName, tenantId)
const rateLimitMap = new Map();
const ajv = new ajv_1.default({ allErrors: true, strict: false });
class ToolRegistry {
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            logger_1.logger.warn('Tool already registered, overwriting', { name: tool.name });
        }
        this.tools.set(tool.name, tool);
        logger_1.logger.info('Tool registered', { name: tool.name, version: tool.version, category: tool.category });
    }
    getTool(name, tenantId) {
        return this.tools.get(name);
    }
    listTools(options) {
        const all = Array.from(this.tools.values());
        if (options?.category) {
            return all.filter((t) => t.category === options.category);
        }
        return all;
    }
    /**
     * Validate tool arguments against its JSON Schema.
     * Returns null if valid, or an error message if invalid.
     */
    validateInput(toolName, input) {
        const tool = this.tools.get(toolName);
        if (!tool)
            return `Tool '${toolName}' not found`;
        const validate = ajv.compile(tool.inputSchema);
        const valid = validate(input);
        if (!valid) {
            return ajv.errorsText(validate.errors);
        }
        return null;
    }
    /**
     * Execute a tool with full validation + rate limiting.
     * Called by the agent runtime for native function-calling.
     */
    async execute(toolName, input, ctx, tenantAllowList) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            return { success: false, error: `Tool '${toolName}' not registered` };
        }
        // Tenant allow-list check
        if (tenantAllowList && !tenantAllowList.includes(toolName)) {
            return {
                success: false,
                error: `Tool '${toolName}' is not in the allowed list for this workflow`,
            };
        }
        // Input validation
        const validationError = this.validateInput(toolName, input);
        if (validationError) {
            logger_1.logger.warn('Tool input validation failed', { toolName, error: validationError });
            return {
                success: false,
                error: `Input validation failed: ${validationError}`,
            };
        }
        // Rate limiting
        const rlKey = `${toolName}:${ctx.tenantId}`;
        const now = Date.now();
        const rl = rateLimitMap.get(rlKey) ?? { count: 0, resetAt: now + tool.rateLimitPolicy.windowMs };
        if (now > rl.resetAt) {
            rl.count = 0;
            rl.resetAt = now + tool.rateLimitPolicy.windowMs;
        }
        if (rl.count >= tool.rateLimitPolicy.requests) {
            return {
                success: false,
                error: `Rate limit exceeded for tool '${toolName}'. Try again in ${Math.ceil((rl.resetAt - now) / 1000)}s`,
            };
        }
        rl.count++;
        rateLimitMap.set(rlKey, rl);
        const start = Date.now();
        try {
            const result = await tool.execute(input, ctx);
            result.metadata = { ...result.metadata, latencyMs: Date.now() - start };
            return result;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Tool execution error', { toolName, error: message });
            return { success: false, error: message };
        }
    }
    /**
     * Get Gemini function declarations for a subset of tools (for native tool-use).
     */
    getGeminiFunctionDeclarations(toolNames) {
        return toolNames
            .map((name) => this.tools.get(name))
            .filter(Boolean)
            .map((tool) => (0, interface_1.toolToGeminiFunctionDeclaration)(tool));
    }
}
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=registry.js.map