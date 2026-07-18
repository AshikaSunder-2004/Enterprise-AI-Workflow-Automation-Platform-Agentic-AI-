"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeParallelNode = executeParallelNode;
const index_1 = require("./index");
const context_resolver_1 = require("../context-resolver");
const logger_1 = require("../../observability/logger");
async function executeParallelNode(node, ctx, definition) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    const nodeMap = (0, context_resolver_1.buildNodeMap)(definition);
    log.info('Executing parallel branches', { branches: node.branches.length });
    const branchPromises = node.branches.map(async (nodeSequence, branchIndex) => {
        // Create a copy of context for each branch
        const branchCtx = {
            ...ctx,
            variables: { ...ctx.variables },
        };
        const branchOutputs = {};
        for (const nodeId of nodeSequence) {
            const branchNode = nodeMap.get(nodeId);
            if (!branchNode)
                continue;
            const result = await (0, index_1.executeNode)(branchNode, branchCtx, definition);
            if (result.status === 'completed') {
                const outputKey = branchNode.outputKey;
                if (outputKey && result.output !== undefined) {
                    branchCtx.variables[outputKey] = result.output;
                    branchOutputs[outputKey] = result.output;
                }
            }
            else if (result.status === 'failed') {
                throw new Error(`Branch ${branchIndex} failed at node ${nodeId}: ${result.error}`);
            }
        }
        return { branchIndex, outputs: branchOutputs };
    });
    let results;
    if (node.joinStrategy === 'wait_first') {
        const first = await Promise.race(branchPromises);
        results = [first];
    }
    else {
        // wait_all
        results = await Promise.all(branchPromises);
    }
    // Merge outputs from all branches into context
    const mergedOutputs = {};
    for (const result of results) {
        Object.assign(mergedOutputs, result.outputs);
    }
    return { status: 'parallel_done', outputs: mergedOutputs };
}
//# sourceMappingURL=parallel-node.js.map