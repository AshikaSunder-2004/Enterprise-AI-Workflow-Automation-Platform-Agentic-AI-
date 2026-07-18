"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBranchNode = executeBranchNode;
const context_resolver_1 = require("../context-resolver");
const repositories_1 = require("../../db/repositories");
const logger_1 = require("../../observability/logger");
async function executeBranchNode(node, ctx) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    for (const condition of node.conditions) {
        const result = (0, context_resolver_1.evaluateCondition)(condition.expression, ctx);
        log.debug('Evaluating branch condition', { expression: condition.expression, result });
        if (result) {
            await repositories_1.eventRepo.append({
                runId: ctx.runId,
                nodeId: node.id,
                type: 'NODE_COMPLETED',
                payload: {
                    branch: 'condition_matched',
                    conditionId: condition.id,
                    expression: condition.expression,
                    nextNodeId: condition.targetNodeId,
                },
            });
            return { status: 'branched', nextNodeId: condition.targetNodeId };
        }
    }
    // Default branch
    log.debug('No condition matched, taking default branch', { defaultTarget: node.defaultTargetNodeId });
    await repositories_1.eventRepo.append({
        runId: ctx.runId,
        nodeId: node.id,
        type: 'NODE_COMPLETED',
        payload: { branch: 'default', nextNodeId: node.defaultTargetNodeId },
    });
    return { status: 'branched', nextNodeId: node.defaultTargetNodeId };
}
//# sourceMappingURL=branch-node.js.map