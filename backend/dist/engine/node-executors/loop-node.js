"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeLoopNode = executeLoopNode;
const types_1 = require("../types");
const index_1 = require("./index");
const context_resolver_1 = require("../context-resolver");
const logger_1 = require("../../observability/logger");
async function executeLoopNode(node, ctx, definition) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    const nodeMap = (0, context_resolver_1.buildNodeMap)(definition);
    let iteration = 0;
    ctx.variables[node.iterationCountKey] = 0;
    log.info('Starting loop node', { exitCondition: node.exitCondition, maxIterations: node.maxIterations });
    while (iteration < node.maxIterations) {
        // Check exit condition before executing body
        if (iteration > 0 && (0, context_resolver_1.evaluateCondition)(node.exitCondition, ctx)) {
            log.info('Loop exit condition met', { iteration });
            break;
        }
        log.debug('Loop iteration', { iteration });
        ctx.variables[node.iterationCountKey] = iteration;
        for (const nodeId of node.bodyNodeIds) {
            const bodyNode = nodeMap.get(nodeId);
            if (!bodyNode)
                continue;
            const result = await (0, index_1.executeNode)(bodyNode, ctx, definition);
            if (result.status === 'completed') {
                const outputKey = bodyNode.outputKey;
                if (outputKey && result.output !== undefined) {
                    ctx.variables[outputKey] = result.output;
                }
            }
            else if (result.status === 'failed') {
                throw new types_1.WorkflowError('TOOL_FAILURE', result.error, result.retryable);
            }
            else if (result.status === 'waiting_human') {
                // Human pause inside a loop — uncommon but supported
                return result;
            }
        }
        iteration++;
        // Check exit condition after executing body
        if ((0, context_resolver_1.evaluateCondition)(node.exitCondition, ctx)) {
            log.info('Loop exit condition met after iteration', { iteration });
            break;
        }
    }
    if (iteration >= node.maxIterations) {
        log.warn('Loop reached max iterations', { maxIterations: node.maxIterations });
    }
    return {
        status: 'completed',
        output: { iterations: iteration, finalContext: ctx.variables },
    };
}
//# sourceMappingURL=loop-node.js.map