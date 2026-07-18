"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeHumanNode = executeHumanNode;
const repositories_1 = require("../../db/repositories");
const context_resolver_1 = require("../context-resolver");
const notifier_1 = require("../../notifications/notifier");
const logger_1 = require("../../observability/logger");
async function executeHumanNode(node, ctx) {
    const log = (0, logger_1.traceLogger)(ctx.runId, node.id, ctx.tenantId);
    // Resolve prompt template
    const resolvedPrompt = (0, context_resolver_1.resolveTemplate)(node.prompt, ctx);
    log.info('Creating human task', { nodeId: node.id, assignTo: node.assignTo });
    // Create the human task record
    const task = await repositories_1.humanTaskRepo.create({
        run: { connect: { id: ctx.runId } },
        nodeId: node.id,
        prompt: resolvedPrompt,
        context: ctx.variables,
        ...(node.assignTo ? { assignee: { connect: { id: node.assignTo } } } : {}),
        status: 'PENDING',
    });
    await repositories_1.eventRepo.append({
        runId: ctx.runId,
        nodeId: node.id,
        type: 'HUMAN_INPUT_REQUESTED',
        payload: { taskId: task.id, prompt: resolvedPrompt, assignTo: node.assignTo },
    });
    // Send notification to approver
    try {
        await notifier_1.notifier.notify({
            type: 'human_task',
            taskId: task.id,
            runId: ctx.runId,
            tenantId: ctx.tenantId,
            prompt: resolvedPrompt,
            assignedTo: node.assignTo,
        });
    }
    catch (err) {
        log.warn('Failed to send human task notification', { err });
    }
    return { status: 'waiting_human', taskId: task.id };
}
//# sourceMappingURL=human-node.js.map