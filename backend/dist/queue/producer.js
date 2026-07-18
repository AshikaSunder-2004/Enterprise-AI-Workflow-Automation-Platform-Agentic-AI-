"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = exports.resumeQueue = exports.workflowQueue = void 0;
exports.enqueueWorkflowRun = enqueueWorkflowRun;
exports.enqueueResumeRun = enqueueResumeRun;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const env_1 = require("../config/env");
const logger_1 = require("../observability/logger");
const connection = new ioredis_1.Redis(env_1.config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
});
exports.redisConnection = connection;
// ─── Queues ────────────────────────────────────────────────────────────────
exports.workflowQueue = new bullmq_1.Queue('workflow-runs', {
    connection: connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});
exports.resumeQueue = new bullmq_1.Queue('workflow-resumes', {
    connection: connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
    },
});
// ─── Producer Helpers ──────────────────────────────────────────────────────
async function enqueueWorkflowRun(data) {
    const job = await exports.workflowQueue.add('execute', data, {
        jobId: `run:${data.runId}`, // Idempotent job ID
    });
    logger_1.logger.info('Workflow run enqueued', { jobId: job.id, runId: data.runId });
    return job.id ?? data.runId;
}
async function enqueueResumeRun(data) {
    await exports.resumeQueue.add('resume', data, {
        jobId: `resume:${data.runId}:${data.humanTaskId}`,
    });
    logger_1.logger.info('Workflow resume enqueued', { runId: data.runId, taskId: data.humanTaskId });
}
//# sourceMappingURL=producer.js.map