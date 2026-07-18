import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env';
import { logger } from '../observability/logger';

export interface WorkflowJobData {
  runId: string;
  tenantId: string;
  workflowId: string;
  versionId: string;
}

export interface ResumeJobData {
  runId: string;
  tenantId: string;
  humanTaskId: string;
  decision: 'approved' | 'rejected';
  input: unknown;
}

const connection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// ─── Queues ────────────────────────────────────────────────────────────────

export const workflowQueue = new Queue<WorkflowJobData, void, string>('workflow-runs', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const resumeQueue = new Queue<ResumeJobData, void, string>('workflow-resumes', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
  },
});

// ─── Producer Helpers ──────────────────────────────────────────────────────

export async function enqueueWorkflowRun(data: WorkflowJobData): Promise<string> {
  const job = await workflowQueue.add('execute', data, {
    jobId: `run-${data.runId}`, // Idempotent job ID
  });
  logger.info('Workflow run enqueued', { jobId: job.id, runId: data.runId });
  return job.id ?? data.runId;
}

export async function enqueueResumeRun(data: ResumeJobData): Promise<void> {
  await resumeQueue.add('resume', data, {
    jobId: `resume-${data.runId}-${data.humanTaskId}`,
  });
  logger.info('Workflow resume enqueued', { runId: data.runId, taskId: data.humanTaskId });
}

export { connection as redisConnection };
