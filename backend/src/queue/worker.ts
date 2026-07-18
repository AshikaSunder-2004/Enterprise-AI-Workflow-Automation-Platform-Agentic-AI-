import '../config/env'; // Validate env first
import { Worker, Job } from 'bullmq';
import { redisConnection, WorkflowJobData, ResumeJobData } from './producer';
import { runRepo, versionRepo, eventRepo, humanTaskRepo } from '../db/repositories';
import { executeWorkflow } from '../engine/workflow-runner';
import { WorkflowDefinition, ExecutionContext } from '../engine/types';
import { initializeTools } from '../tools';
import { logger } from '../observability/logger';

// Initialize tool registry
initializeTools();

logger.info('BullMQ Worker starting...');

// ─── Workflow Run Worker ──────────────────────────────────────────────────

const runWorker = new Worker<WorkflowJobData, void, string>(
  'workflow-runs',
  async (job: Job<WorkflowJobData>) => {
    const { runId, tenantId, workflowId, versionId } = job.data;
    logger.info('Processing workflow run', { runId, jobId: job.id });

    const version = await versionRepo.findById(versionId);
    if (!version) {
      throw new Error(`WorkflowVersion ${versionId} not found`);
    }

    const definition = version.definition as unknown as WorkflowDefinition;
    const run = await runRepo.findById(runId, tenantId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const ctx: ExecutionContext = {
      runId,
      tenantId,
      workflowId,
      triggerPayload: run.triggerPayload,
      variables: (run.context as Record<string, unknown>) ?? {},
    };

    await executeWorkflow({ runId, tenantId, workflowId, definition, initialContext: ctx });
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
  }
);

// ─── Resume Worker (human task resolved) ─────────────────────────────────

const resumeWorker = new Worker<ResumeJobData, void, string>(
  'workflow-resumes',
  async (job: Job<ResumeJobData>) => {
    const { runId, tenantId, humanTaskId, decision, input } = job.data;
    logger.info('Processing workflow resume', { runId, humanTaskId, decision });

    if (decision === 'rejected') {
      await runRepo.updateStatus(runId, 'FAILED', {
        errorMessage: 'Rejected by human approver',
      });
      await eventRepo.append({
        runId,
        type: 'HUMAN_INPUT_RECEIVED',
        payload: { decision: 'rejected', taskId: humanTaskId },
      });
      return;
    }

    // Inject human input into context and resume
    const run = await runRepo.findById(runId, tenantId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const task = await humanTaskRepo.findByRun(runId)
      .then((tasks) => tasks.find((t) => t.id === humanTaskId));

    if (!task) throw new Error(`HumanTask ${humanTaskId} not found`);

    const version = await versionRepo.findById(run.versionId);
    if (!version) throw new Error(`Version not found`);

    const definition = version.definition as unknown as WorkflowDefinition;
    const currentCtx = run.context as Record<string, unknown>;

    // Find the node's outputKey and inject human response
    const node = (definition.nodes as Array<{ id: string; outputKey?: string }>)
      .find((n) => n.id === task.nodeId);
    if (node?.outputKey) {
      currentCtx[node.outputKey] = input;
    }

    await eventRepo.append({
      runId,
      nodeId: task.nodeId,
      type: 'HUMAN_INPUT_RECEIVED',
      payload: { decision: 'approved', response: input, taskId: humanTaskId },
    });

    // Find the next node after the human node
    const edges = (definition as WorkflowDefinition).edges;
    const nextEdge = edges.find((e) => e.source === task.nodeId);

    if (nextEdge) {
      await runRepo.checkpoint(runId, nextEdge.target, currentCtx);
    }

    // Re-enqueue for execution from next node
    const { enqueueWorkflowRun } = await import('./producer');
    await enqueueWorkflowRun({ runId, tenantId, workflowId: run.workflowId, versionId: run.versionId });
  },
  { connection: redisConnection as any, concurrency: 5 }
);

// ─── Error handlers ────────────────────────────────────────────────────────

runWorker.on('failed', (job, err) => {
  logger.error('Run job failed', {
    jobId: job?.id,
    runId: job?.data?.runId,
    error: err.message,
    stack: err.stack,
  });
});

resumeWorker.on('failed', (job, err) => {
  logger.error('Resume job failed', { jobId: job?.id, error: err.message });
});

runWorker.on('completed', (job) => {
  logger.info('Run job completed', { jobId: job.id, runId: job.data.runId });
});

// ─── Crash recovery: resume stale running jobs on startup ─────────────────

async function recoverStaleRuns() {
  const staleRuns = await runRepo.findStaleRunning();
  logger.info(`Recovering ${staleRuns.length} stale runs...`);

  const { enqueueWorkflowRun } = await import('./producer');
  for (const run of staleRuns) {
    await enqueueWorkflowRun({
      runId: run.id,
      tenantId: run.tenantId,
      workflowId: run.workflowId,
      versionId: run.versionId,
    });
  }
}

recoverStaleRuns().catch((err) => logger.error('Stale run recovery failed', { err }));

logger.info('Workers ready');
