import { Tool, ToolResult, ExecutionContext } from './interface';
declare class ToolRegistry {
    private tools;
    register(tool: Tool): void;
    getTool(name: string, tenantId: string): Tool | undefined;
    listTools(options?: {
        category?: string;
        tenantId?: string;
    }): Tool[];
    /**
     * Validate tool arguments against its JSON Schema.
     * Returns null if valid, or an error message if invalid.
     */
    validateInput(toolName: string, input: unknown): string | null;
    /**
     * Execute a tool with full validation + rate limiting.
     * Called by the agent runtime for native function-calling.
     */
    execute(toolName: string, input: unknown, ctx: ExecutionContext, tenantAllowList?: string[]): Promise<ToolResult>;
    /**
     * Get Gemini function declarations for a subset of tools (for native tool-use).
     */
    getGeminiFunctionDeclarations(toolNames: string[]): {
        name: string;
        description: string;
        parameters: import("json-schema").JSONSchema7;
    }[];
}
export declare const toolRegistry: ToolRegistry;
export {};
//# sourceMappingURL=registry.d.ts.map