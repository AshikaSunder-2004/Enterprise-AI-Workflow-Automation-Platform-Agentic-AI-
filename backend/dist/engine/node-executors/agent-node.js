"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAgentNode = executeAgentNode;
const types_1 = require("../types");
const executor_1 = require("../../agent/executor");
const logger_1 = require("../../observability/logger");
async function executeAgentNode(node, ctx) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    log.info('Starting agent node', { goal: node.goal, tools: node.allowedTools });
    const result = await (0, executor_1.runAgentExecutor)({
        runId: ctx.runId,
        nodeId: node.id,
        tenantId: ctx.tenantId,
        goal: node.goal,
        context: ctx.variables,
        allowedTools: node.allowedTools,
        maxIterations: node.maxIterations,
        budgetTokens: node.budgetTokens,
        systemPrompt: node.systemPrompt,
    });
    switch (result.status) {
        case 'completed':
            log.info('Agent node completed', { iterationsUsed: result.iterationsUsed });
            return { status: 'completed', output: result.output };
        case 'human_escalation':
            // Human escalation from within the agent — the human-node executor handles the task creation.
            // Here we pause the run.
            log.info('Agent escalated to human', { reason: result.humanEscalationReason });
            // Create a synthetic human task
            const { humanTaskRepo } = await Promise.resolve().then(() => __importStar(require('../../db/repositories')));
            const task = await humanTaskRepo.create({
                run: { connect: { id: ctx.runId } },
                nodeId: node.id,
                prompt: result.humanEscalationReason ?? 'Agent requires human input to proceed',
                context: ctx.variables,
                status: 'PENDING',
            });
            return { status: 'waiting_human', taskId: task.id };
        case 'budget_exceeded':
            throw new types_1.WorkflowError('BUDGET_EXCEEDED', `Agent budget exceeded after ${result.iterationsUsed} iterations`, false);
        case 'max_iterations':
            throw new types_1.WorkflowError('AGENT_MAX_ITERATIONS', `Agent reached max iterations (${node.maxIterations}) without completing goal`, false);
        case 'error':
        default:
            throw new types_1.WorkflowError('INTERNAL_ERROR', 'Agent executor encountered an error', true);
    }
}
//# sourceMappingURL=agent-node.js.map