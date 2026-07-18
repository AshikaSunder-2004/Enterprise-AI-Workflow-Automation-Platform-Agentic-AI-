"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNode = executeNode;
const agent_node_1 = require("./agent-node");
const tool_node_1 = require("./tool-node");
const human_node_1 = require("./human-node");
const branch_node_1 = require("./branch-node");
const parallel_node_1 = require("./parallel-node");
const loop_node_1 = require("./loop-node");
const types_1 = require("../types");
async function executeNode(node, ctx, definition) {
    switch (node.type) {
        case 'start':
            return { status: 'completed', output: null };
        case 'end':
            return { status: 'completed', output: null };
        case 'agent':
            return (0, agent_node_1.executeAgentNode)(node, ctx);
        case 'tool':
            return (0, tool_node_1.executeToolNode)(node, ctx);
        case 'human':
            return (0, human_node_1.executeHumanNode)(node, ctx);
        case 'branch':
            return (0, branch_node_1.executeBranchNode)(node, ctx);
        case 'parallel':
            return (0, parallel_node_1.executeParallelNode)(node, ctx, definition);
        case 'loop':
            return (0, loop_node_1.executeLoopNode)(node, ctx, definition);
        case 'subworkflow':
            // Subworkflow: enqueue as a child run, await completion
            throw new types_1.WorkflowError('INTERNAL_ERROR', 'Subworkflow nodes require orchestration via queue', false);
        default:
            throw new types_1.WorkflowError('INTERNAL_ERROR', `Unknown node type: ${node.type}`, false);
    }
}
//# sourceMappingURL=index.js.map