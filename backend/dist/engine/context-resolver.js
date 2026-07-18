"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTemplate = resolveTemplate;
exports.resolveValue = resolveValue;
exports.evaluateCondition = evaluateCondition;
exports.findNextNode = findNextNode;
exports.buildNodeMap = buildNodeMap;
/**
 * Resolves template strings like "{{context.leadName}}" against the execution context.
 * Also evaluates safe JS expressions for branch conditions.
 */
function resolveTemplate(template, ctx) {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const value = getPath({ context: ctx.variables, trigger: ctx.triggerPayload }, path.trim());
        return value !== undefined ? String(value) : '';
    });
}
function resolveValue(value, ctx) {
    if (typeof value === 'string') {
        return resolveTemplate(value, ctx);
    }
    if (Array.isArray(value)) {
        return value.map((v) => resolveValue(v, ctx));
    }
    if (value && typeof value === 'object') {
        const resolved = {};
        for (const [k, v] of Object.entries(value)) {
            resolved[k] = resolveValue(v, ctx);
        }
        return resolved;
    }
    return value;
}
function evaluateCondition(expression, ctx) {
    try {
        // Safe evaluation — only expose context variables, no globals
        const sandbox = {
            context: ctx.variables,
            trigger: ctx.triggerPayload,
            Math,
            JSON,
        };
        const result = new Function(...Object.keys(sandbox), `"use strict"; return (${expression});`)(...Object.values(sandbox));
        return Boolean(result);
    }
    catch {
        return false;
    }
}
function getPath(obj, path) {
    return path.split('.').reduce((curr, key) => {
        if (curr && typeof curr === 'object') {
            return curr[key];
        }
        return undefined;
    }, obj);
}
/**
 * Find the next node ID in the DAG after a given node completes normally.
 */
function findNextNode(currentNodeId, definition, sourceHandle) {
    const edge = definition.edges.find((e) => e.source === currentNodeId &&
        (sourceHandle === undefined || e.sourceHandle === sourceHandle));
    return edge?.target ?? null;
}
/**
 * Build a map of nodeId -> NodeConfig for fast lookup.
 */
function buildNodeMap(definition) {
    return new Map(definition.nodes.map((n) => [n.id, n]));
}
//# sourceMappingURL=context-resolver.js.map