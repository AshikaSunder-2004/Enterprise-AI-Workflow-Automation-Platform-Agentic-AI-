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
require("../config/env"); // Validate env first
const bullmq_1 = require("bullmq");
const producer_1 = require("./producer");
const repositories_1 = require("../db/repositories");
const workflow_runner_1 = require("../engine/workflow-runner");
const tools_1 = require("../tools");
const logger_1 = require("../observability/logger");
// Initialize tool registry
(0, tools_1.initializeTools)();
logger_1.logger.info('BullMQ Worker starting...');
// ─── Workflow Run Worker ──────────────────────────────────────────────────
const runWorker = new bullmq_1.Worker('workflow-runs', async (job) => {
    const { runId, tenantId, workflowId, versionId } = job.data;
    logger_1.logger.info('Processing workflow run', { runId, jobId: job.id });
    const version = await repositories_1.versionRepo.findById(versionId);
    if (!version) {
        throw new Error(`WorkflowVersion ${versionId} not found`);
    }
    const definition = version.definition;
    const run = await repositories_1.runRepo.findById(runId, tenantId);
    if (!run)
        throw new Error(`Run ${runId} not found`);
    const ctx = {
        runId,
        tenantId,
        workflowId,
        triggerPayload: run.triggerPayload,
        variables: run.context ?? {},
    };
    await (0, workflow_runner_1.executeWorkflow)({ runId, tenantId, workflowId, definition, initialContext: ctx });
}, {
    connection: producer_1.redisConnection,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
});
// ─── Resume Worker (human task resolved) ─────────────────────────────────
const resumeWorker = new bullmq_1.Worker('workflow-resumes', async (job) => {
    const { runId, tenantId, humanTaskId, decision, input } = job.data;
    logger_1.logger.info('Processing workflow resume', { runId, humanTaskId, decision });
    if (decision === 'rejected') {
        await repositories_1.runRepo.updateStatus(runId, 'FAILED', {
            errorMessage: 'Rejected by human approver',
        });
        await repositories_1.eventRepo.append({
            runId,
            type: 'HUMAN_INPUT_RECEIVED',
            payload: { decision: 'rejected', taskId: humanTaskId },
        });
        return;
    }
    // Inject human input into context and resume
    const run = await repositories_1.runRepo.findById(runId, tenantId);
    if (!run)
        throw new Error(`Run ${runId} not found`);
    const task = await repositories_1.humanTaskRepo.findByRun(runId)
        .then((tasks) => tasks.find((t) => t.id === humanTaskId));
    if (!task)
        throw new Error(`HumanTask ${humanTaskId} not found`);
    const version = await repositories_1.versionRepo.findById(run.versionId);
    if (!version)
        throw new Error(`Version not found`);
    const definition = version.definition;
    const currentCtx = run.context;
    // Find the node's outputKey and inject human response
    const node = definition.nodes
        .find((n) => n.id === task.nodeId);
    if (node?.outputKey) {
        currentCtx[node.outputKey] = input;
    }
    await repositories_1.eventRepo.append({
        runId,
        nodeId: task.nodeId,
        type: 'HUMAN_INPUT_RECEIVED',
        payload: { decision: 'approved', response: input, taskId: humanTaskId },
    });
    // Find the next node after the human node
    const edges = definition.edges;
    const nextEdge = edges.find((e) => e.source === task.nodeId);
    if (nextEdge) {
        await repositories_1.runRepo.checkpoint(runId, nextEdge.target, currentCtx);
    }
    // Re-enqueue for execution from next node
    const { enqueueWorkflowRun } = await Promise.resolve().then(() => __importStar(require('./producer')));
    await enqueueWorkflowRun({ runId, tenantId, workflowId: run.workflowId, versionId: run.versionId });
}, { connection: producer_1.redisConnection, concurrency: 5 });
// ─── Error handlers ────────────────────────────────────────────────────────
runWorker.on('failed', (job, err) => {
    logger_1.logger.error('Run job failed', {
        jobId: job?.id,
        runId: job?.data?.runId,
        error: err.message,
        stack: err.stack,
    });
});
resumeWorker.on('failed', (job, err) => {
    logger_1.logger.error('Resume job failed', { jobId: job?.id, error: err.message });
});
runWorker.on('completed', (job) => {
    logger_1.logger.info('Run job completed', { jobId: job.id, runId: job.data.runId });
});
// ─── Crash recovery: resume stale running jobs on startup ─────────────────
async function recoverStaleRuns() {
    const staleRuns = await repositories_1.runRepo.findStaleRunning();
    logger_1.logger.info(`Recovering ${staleRuns.length} stale runs...`);
    const { enqueueWorkflowRun } = await Promise.resolve().then(() => __importStar(require('./producer')));
    for (const run of staleRuns) {
        await enqueueWorkflowRun({
            runId: run.id,
            tenantId: run.tenantId,
            workflowId: run.workflowId,
            versionId: run.versionId,
        });
    }
}
recoverStaleRuns().catch((err) => logger_1.logger.error('Stale run recovery failed', { err }));
logger_1.logger.info('Workers ready');
//# sourceMappingURL=worker.js.map