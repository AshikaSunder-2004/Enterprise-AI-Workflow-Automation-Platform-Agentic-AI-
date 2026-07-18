import { HumanNodeConfig, ExecutionContext, NodeResult } from '../types';
import { humanTaskRepo, eventRepo } from '../../db/repositories';
import { resolveTemplate } from '../context-resolver';
import { notifier } from '../../notifications/notifier';
import { traceLogger } from '../../observability/logger';

export async function executeHumanNode(
  node: HumanNodeConfig,
  ctx: ExecutionContext
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);

  // Resolve prompt template
  const resolvedPrompt = resolveTemplate(node.prompt, ctx);

  log.info('Creating human task', { nodeId: node.id, assignTo: node.assignTo });

  // Create the human task record
  const task = await humanTaskRepo.create({
    run: { connect: { id: ctx.runId } },
    nodeId: node.id,
    prompt: resolvedPrompt,
    context: ctx.variables as object,
    ...(node.assignTo ? { assignee: { connect: { id: node.assignTo } } } : {}),
    status: 'PENDING',
  });

  await eventRepo.append({
    runId: ctx.runId,
    nodeId: node.id,
    type: 'HUMAN_INPUT_REQUESTED',
    payload: { taskId: task.id, prompt: resolvedPrompt, assignTo: node.assignTo },
  });

  // Send notification to approver
  try {
    await notifier.notify({
      type: 'human_task',
      taskId: task.id,
      runId: ctx.runId,
      tenantId: ctx.tenantId,
      prompt: resolvedPrompt,
      assignedTo: node.assignTo,
    });
  } catch (err) {
    log.warn('Failed to send human task notification', { err });
  }

  return { status: 'waiting_human', taskId: task.id };
}
