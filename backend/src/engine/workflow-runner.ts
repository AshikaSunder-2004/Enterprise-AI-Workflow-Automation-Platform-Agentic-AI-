import { runRepo, eventRepo } from '../db/repositories';
import { WorkflowDefinition, ExecutionContext, NodeConfig, WorkflowError } from './types';
import { buildNodeMap, findNextNode, resolveValue } from './context-resolver';
import { executeNode } from './node-executors';
import { wss } from '../api/websocket';
import { logger, runLogger } from '../observability/logger';

export interface RunnerOptions {
  runId: string;
  tenantId: string;
  workflowId: string;
  definition: WorkflowDefinition;
  initialContext: ExecutionContext;
}

/**
 * Core workflow runner — durable state machine.
 * Called by the BullMQ worker. Crash-safe: picks up from last checkpointed node.
 */
export async function executeWorkflow(opts: RunnerOptions): Promise<void> {
  const { runId, tenantId, definition } = opts;
  const log = runLogger(runId, tenantId);
  const nodeMap = buildNodeMap(definition);

  // Load current run state (for resume-on-crash)
  const run = await runRepo.findById(runId, tenantId);
  if (!run) throw new WorkflowError('WORKFLOW_NOT_FOUND', `Run ${runId} not found`);

  if (run.status === 'COMPLETED' || run.status === 'CANCELLED') {
    log.info('Run already in terminal state, skipping', { status: run.status });
    return;
  }

  // Find the node to start from
  const startNodeId =
    run.currentNodeId ??
    definition.nodes.find((n) => n.type === 'start')?.id;

  if (!startNodeId) {
    await failRun(runId, 'No start node found in workflow definition');
    return;
  }

  // Restore or initialize context
  const ctx: ExecutionContext = {
    runId,
    tenantId,
    workflowId: opts.workflowId,
    triggerPayload: run.triggerPayload,
    variables: (run.context as Record<string, unknown>) ?? opts.initialContext.variables,
  };

  await runRepo.updateStatus(runId, 'RUNNING');
  emitWs(tenantId, runId, { type: 'run_started', runId, status: 'RUNNING' });
  log.info('Workflow execution starting', { startNodeId });

  let currentNodeId: string | null = startNodeId;

  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (!node) {
      await failRun(runId, `Node ${currentNodeId} not found in definition`);
      return;
    }

    if (node.type === 'end') {
      // Workflow complete
      await runRepo.updateStatus(runId, 'COMPLETED');
      await eventRepo.append({ runId, nodeId: currentNodeId, type: 'STATE_TRANSITION', payload: { status: 'COMPLETED' } });
      emitWs(tenantId, runId, { type: 'run_completed', runId, status: 'COMPLETED' });
      log.info('Workflow completed successfully');
      return;
    }

    log.info('Executing node', { nodeId: currentNodeId, nodeType: node.type });
    await eventRepo.append({ runId, nodeId: currentNodeId, type: 'NODE_STARTED', payload: { nodeId: currentNodeId, nodeType: node.type } });
    emitWs(tenantId, runId, { type: 'node_started', nodeId: currentNodeId, nodeType: node.type });

    try {
      const result = await executeNodeWithRetry(node, ctx, definition, runId);

      if (result.status === 'waiting_human') {
        // Pause execution — worker will be re-triggered when human responds
        await runRepo.updateStatus(runId, 'WAITING_HUMAN', {
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
        const outputKey = (node as { outputKey?: string }).outputKey;
        if (outputKey && result.output !== undefined) {
          ctx.variables[outputKey] = result.output;
        }
      }
      await runRepo.checkpoint(runId, currentNodeId, ctx.variables);

      await eventRepo.append({
        runId,
        nodeId: currentNodeId,
        type: 'NODE_COMPLETED',
        payload: { nodeId: currentNodeId, output: 'output' in result ? result.output : undefined },
      });
      emitWs(tenantId, runId, { type: 'node_completed', nodeId: currentNodeId });

      // Determine next node
      if (result.status === 'branched') {
        currentNodeId = result.nextNodeId;
      } else {
        currentNodeId = findNextNode(currentNodeId, definition);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const retryable = err instanceof WorkflowError ? err.retryable : false;
      log.error('Node execution failed', { nodeId: currentNodeId, err });

      await eventRepo.append({
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
  await runRepo.updateStatus(runId, 'COMPLETED');
  log.info('Workflow completed (reached terminal node)');
}

async function executeNodeWithRetry(
  node: NodeConfig,
  ctx: ExecutionContext,
  definition: WorkflowDefinition,
  runId: string
) {
  const maxRetries = node.retries ?? 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await executeNode(node, ctx, definition);
    } catch (err: unknown) {
      const retryable = err instanceof WorkflowError ? err.retryable : false;
      if (!retryable || attempt >= maxRetries) throw err;

      const delay = (node.retryDelay ?? 1000) * Math.pow(2, attempt);
      logger.warn('Retrying node after error', { nodeId: node.id, attempt, delay });
      await sleep(delay);
      attempt++;
    }
  }
  throw new WorkflowError('INTERNAL_ERROR', 'Node retry exhausted');
}

async function failRun(runId: string, errorMessage: string): Promise<void> {
  await runRepo.updateStatus(runId, 'FAILED', { errorMessage });
  await eventRepo.append({
    runId,
    type: 'STATE_TRANSITION',
    payload: { status: 'FAILED', error: errorMessage },
  });
  logger.error('Run failed', { runId, errorMessage });
}

function emitWs(tenantId: string, runId: string, data: object): void {
  try {
    wss.broadcastToTenant(tenantId, { ...data, runId });
  } catch {
    // WebSocket errors are non-fatal
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
