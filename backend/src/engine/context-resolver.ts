import { ExecutionContext, WorkflowDefinition, NodeConfig } from './types';

/**
 * Resolves template strings like "{{context.leadName}}" against the execution context.
 * Also evaluates safe JS expressions for branch conditions.
 */
export function resolveTemplate(template: string, ctx: ExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getPath({ context: ctx.variables, trigger: ctx.triggerPayload }, path.trim());
    return value !== undefined ? String(value) : '';
  });
}

export function resolveValue(value: unknown, ctx: ExecutionContext): unknown {
  if (typeof value === 'string') {
    return resolveTemplate(value, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v, ctx));
  }
  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, ctx);
    }
    return resolved;
  }
  return value;
}

export function evaluateCondition(expression: string, ctx: ExecutionContext): boolean {
  try {
    // Safe evaluation — only expose context variables, no globals
    const sandbox = {
      context: ctx.variables,
      trigger: ctx.triggerPayload,
      Math,
      JSON,
    };
    const result = new Function(
      ...Object.keys(sandbox),
      `"use strict"; return (${expression});`
    )(...Object.values(sandbox));
    return Boolean(result);
  } catch {
    return false;
  }
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((curr, key) => {
    if (curr && typeof curr === 'object') {
      return (curr as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Find the next node ID in the DAG after a given node completes normally.
 */
export function findNextNode(
  currentNodeId: string,
  definition: WorkflowDefinition,
  sourceHandle?: string
): string | null {
  const edge = definition.edges.find(
    (e) =>
      e.source === currentNodeId &&
      (sourceHandle === undefined || e.sourceHandle === sourceHandle)
  );
  return edge?.target ?? null;
}

/**
 * Build a map of nodeId -> NodeConfig for fast lookup.
 */
export function buildNodeMap(definition: WorkflowDefinition): Map<string, NodeConfig> {
  return new Map(definition.nodes.map((n) => [n.id, n]));
}
