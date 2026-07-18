import { JSONSchema7 } from 'json-schema';

// ─────────────────────────────────────────────
// Tool Interface
// ─────────────────────────────────────────────

export type ToolCategory =
  | 'communication'
  | 'project_management'
  | 'crm'
  | 'data'
  | 'utility'
  | 'generic';

export interface ExecutionContext {
  runId: string;
  tenantId: string;
  idempotencyKey: string;
  connectorConfig?: Record<string, unknown>; // OAuth tokens, API keys etc.
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    latencyMs?: number;
    retriesUsed?: number;
  };
}

export interface RateLimitPolicy {
  requests: number;
  windowMs: number;
}

export interface Tool {
  name: string;
  version: string;
  description: string;
  category: ToolCategory;
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  requiredScopes: string[];
  rateLimitPolicy: RateLimitPolicy;
  execute(input: unknown, ctx: ExecutionContext): Promise<ToolResult>;
}

// ─────────────────────────────────────────────
// Gemini Function Declaration (for LLM native tool use)
// ─────────────────────────────────────────────

export function toolToGeminiFunctionDeclaration(tool: Tool) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}
