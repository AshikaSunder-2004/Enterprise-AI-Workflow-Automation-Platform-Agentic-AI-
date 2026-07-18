import Ajv from 'ajv';
import { Tool, ToolResult, ExecutionContext, toolToGeminiFunctionDeclaration } from './interface';
import { logger } from '../observability/logger';

// Rate limiter per (toolName, tenantId)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const ajv = new Ajv({ allErrors: true, strict: false });

class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn('Tool already registered, overwriting', { name: tool.name });
    }
    this.tools.set(tool.name, tool);
    logger.info('Tool registered', { name: tool.name, version: tool.version, category: tool.category });
  }

  getTool(name: string, tenantId: string): Tool | undefined {
    return this.tools.get(name);
  }

  listTools(options?: { category?: string; tenantId?: string }): Tool[] {
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
  validateInput(toolName: string, input: unknown): string | null {
    const tool = this.tools.get(toolName);
    if (!tool) return `Tool '${toolName}' not found`;

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
  async execute(
    toolName: string,
    input: unknown,
    ctx: ExecutionContext,
    tenantAllowList?: string[]
  ): Promise<ToolResult> {
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
      logger.warn('Tool input validation failed', { toolName, error: validationError });
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Tool execution error', { toolName, error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Get Gemini function declarations for a subset of tools (for native tool-use).
   */
  getGeminiFunctionDeclarations(toolNames: string[]) {
    return toolNames
      .map((name) => this.tools.get(name))
      .filter(Boolean)
      .map((tool) => toolToGeminiFunctionDeclaration(tool!));
  }
}

export const toolRegistry = new ToolRegistry();
