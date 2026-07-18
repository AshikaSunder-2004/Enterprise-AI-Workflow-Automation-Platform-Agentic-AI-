"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolNode = executeToolNode;
const types_1 = require("../types");
const registry_1 = require("../../tools/registry");
const context_resolver_1 = require("../context-resolver");
const repositories_1 = require("../../db/repositories");
const logger_1 = require("../../observability/logger");
const crypto_1 = __importDefault(require("crypto"));
async function executeToolNode(node, ctx) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    // Resolve tool
    const tool = registry_1.toolRegistry.getTool(node.toolName, ctx.tenantId);
    if (!tool) {
        throw new types_1.WorkflowError('TOOL_FAILURE', `Tool '${node.toolName}' not found in registry`, false);
    }
    // Idempotency key
    const idempotencyKey = node.idempotencyKey ??
        crypto_1.default
            .createHash('sha256')
            .update(`${ctx.runId}-${node.id}`)
            .digest('hex');
    // Resolve input mappings from context
    const resolvedInput = (0, context_resolver_1.resolveValue)(node.inputMapping, ctx);
    log.info('Executing tool node', { toolName: node.toolName, idempotencyKey });
    // Log tool call event
    await repositories_1.eventRepo.append({
        runId: ctx.runId,
        nodeId: node.id,
        type: 'TOOL_CALL',
        payload: { toolName: node.toolName, input: resolvedInput, idempotencyKey },
    });
    try {
        const result = await tool.execute(resolvedInput, {
            runId: ctx.runId,
            tenantId: ctx.tenantId,
            idempotencyKey,
        });
        await repositories_1.eventRepo.append({
            runId: ctx.runId,
            nodeId: node.id,
            type: 'TOOL_RESULT',
            payload: { toolName: node.toolName, result: result.data },
        });
        log.info('Tool node completed', { toolName: node.toolName });
        return { status: 'completed', output: result.data };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error('Tool node failed', { toolName: node.toolName, error: message });
        await repositories_1.eventRepo.append({
            runId: ctx.runId,
            nodeId: node.id,
            type: 'TOOL_RESULT',
            payload: { toolName: node.toolName, error: message, success: false },
        });
        throw new types_1.WorkflowError('TOOL_FAILURE', message, true); // retryable
    }
}
//# sourceMappingURL=tool-node.js.map