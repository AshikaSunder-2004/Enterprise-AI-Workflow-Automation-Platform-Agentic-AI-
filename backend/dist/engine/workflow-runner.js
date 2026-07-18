"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflow = executeWorkflow;
const repositories_1 = require("../db/repositories");
const types_1 = require("./types");
const context_resolver_1 = require("./context-resolver");
const node_executors_1 = require("./node-executors");
const websocket_1 = require("../api/websocket");
const logger_1 = require("../observability/logger");
/**
 * Core workflow runner — durable state machine.
 * Called by the BullMQ worker. Crash-safe: picks up from last checkpointed node.
 */
async function executeWorkflow(opts) {
    const { runId, tenantId, definition } = opts;
    const log = (0, logger_1.runLogger)(runId, tenantId);
    const nodeMap = (0, context_resolver_1.buildNodeMap)(definition);
    // Load current run state (for resume-on-crash)
    const run = await repositories_1.runRepo.findById(runId, tenantId);
    if (!run)
        throw new types_1.WorkflowError('WORKFLOW_NOT_FOUND', `Run ${runId} not found`);
    if (run.status === 'COMPLETED' || run.status === 'CANCELLED') {
        log.info('Run already in terminal state, skipping', { status: run.status });
        return;
    }
    // Find the node to start from
    const startNodeId = run.currentNodeId ??
        definition.nodes.find((n) => n.type === 'start')?.id;
    if (!startNodeId) {
        await failRun(runId, 'No start node found in workflow definition');
        return;
    }
    // Restore or initialize context
    const ctx = {
        runId,
        tenantId,
        workflowId: opts.workflowId,
        triggerPayload: run.triggerPayload,
        variables: run.context ?? opts.initialContext.variables,
    };
    await repositories_1.runRepo.updateStatus(runId, 'RUNNING');
    emitWs(tenantId, runId, { type: 'run_started', runId, status: 'RUNNING' });
    log.info('Workflow execution starting', { startNodeId });
    let currentNodeId = startNodeId;
    while (currentNodeId) {
        const node = nodeMap.get(currentNodeId);
        if (!node) {
            await failRun(runId, `Node ${currentNodeId} not found in definition`);
            return;
        }
        if (node.type === 'end') {
            // Workflow complete
            await repositories_1.runRepo.updateStatus(runId, 'COMPLETED');
            await repositories_1.eventRepo.append({ runId, nodeId: currentNodeId, type: 'STATE_TRANSITION', payload: { status: 'COMPLETED' } });
            emitWs(tenantId, runId, { type: 'run_completed', runId, status: 'COMPLETED' });
            log.info('Workflow completed successfully');
            return;
        }
        log.info('Executing node', { nodeId: currentNodeId, nodeType: node.type });
        await repositories_1.eventRepo.append({ runId, nodeId: currentNodeId, type: 'NODE_STARTED', payload: { nodeId: currentNodeId, nodeType: node.type } });
        emitWs(tenantId, runId, { type: 'node_started', nodeId: currentNodeId, nodeType: node.type });
        try {
            const result = await executeNodeWithRetry(node, ctx, definition, runId);
            if (result.status === 'waiting_human') {
                // Pause execution — worker will be re-triggered when human responds
                await repositories_1.runRepo.updateStatus(runId, 'WAITING_HUMAN', {
                    currentNodeId,
                });
                emitWs(tenantId, runId, { type: 'waiting_human', runId, taskId: result.taskId });
                log.info('Run paused waiting for human input', { taskId: result.taskId });
                return; // Worker exits; resumes when human responds
            }
            if (result.status === 'failed') {
                await failRun(runId, result.error);
                return;
            }
            // Checkpoint after successful node
            if ('output' in result && result.status === 'completed') {
                const outputKey = node.outputKey;
                if (outputKey && result.output !== undefined) {
                    ctx.variables[outputKey] = result.output;
                }
            }
            await repositories_1.runRepo.checkpoint(runId, currentNodeId, ctx.variables);
            await repositories_1.eventRepo.append({
                runId,
                nodeId: currentNodeId,
                type: 'NODE_COMPLETED',
                payload: { nodeId: currentNodeId, output: 'output' in result ? result.output : undefined },
            });
            emitWs(tenantId, runId, { type: 'node_completed', nodeId: currentNodeId });
            // Determine next node
            if (result.status === 'branched') {
                currentNodeId = result.nextNodeId;
            }
            else {
                currentNodeId = (0, context_resolver_1.findNextNode)(currentNodeId, definition);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const retryable = err instanceof types_1.WorkflowError ? err.retryable : false;
            log.error('Node execution failed', { nodeId: currentNodeId, err });
            await repositories_1.eventRepo.append({
                runId,
                nodeId: currentNodeId ?? undefined,
                type: 'NODE_FAILED',
                payload: { nodeId: currentNodeId, error: message },
            });
            if (!retryable) {
                await failRun(runId, message);
                return;
            }
            // Retryable errors bubble up to BullMQ for job-level retry
            throw err;
        }
    }
    // currentNodeId is null — no more edges
    await repositories_1.runRepo.updateStatus(runId, 'COMPLETED');
    log.info('Workflow completed (reached terminal node)');
}
async function executeNodeWithRetry(node, ctx, definition, runId) {
    const maxRetries = node.retries ?? 0;
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            return await (0, node_executors_1.executeNode)(node, ctx, definition);
        }
        catch (err) {
            const retryable = err instanceof types_1.WorkflowError ? err.retryable : false;
            if (!retryable || attempt >= maxRetries)
                throw err;
            const delay = (node.retryDelay ?? 1000) * Math.pow(2, attempt);
            logger_1.logger.warn('Retrying node after error', { nodeId: node.id, attempt, delay });
            await sleep(delay);
            attempt++;
        }
    }
    throw new types_1.WorkflowError('INTERNAL_ERROR', 'Node retry exhausted');
}
async function failRun(runId, errorMessage) {
    await repositories_1.runRepo.updateStatus(runId, 'FAILED', { errorMessage });
    await repositories_1.eventRepo.append({
        runId,
        type: 'STATE_TRANSITION',
        payload: { status: 'FAILED', error: errorMessage },
    });
    logger_1.logger.error('Run failed', { runId, errorMessage });
}
function emitWs(tenantId, runId, data) {
    try {
        websocket_1.wss.broadcastToTenant(tenantId, { ...data, runId });
    }
    catch {
        // WebSocket errors are non-fatal
    }
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=workflow-runner.js.map