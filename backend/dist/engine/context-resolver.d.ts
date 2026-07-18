import { ExecutionContext, WorkflowDefinition, NodeConfig } from './types';
/**
 * Resolves template strings like "{{context.leadName}}" against the execution context.
 * Also evaluates safe JS expressions for branch conditions.
 */
export declare function resolveTemplate(template: string, ctx: ExecutionContext): string;
export declare function resolveValue(value: unknown, ctx: ExecutionContext): unknown;
export declare function evaluateCondition(expression: string, ctx: ExecutionContext): boolean;
/**
 * Find the next node ID in the DAG after a given node completes normally.
 */
export declare function findNextNode(currentNodeId: string, definition: WorkflowDefinition, sourceHandle?: string): string | null;
/**
 * Build a map of nodeId -> NodeConfig for fast lookup.
 */
export declare function buildNodeMap(definition: WorkflowDefinition): Map<string, NodeConfig>;
//# sourceMappingURL=context-resolver.d.ts.map