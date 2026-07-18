import { ToolNodeConfig, ExecutionContext, NodeResult, WorkflowError } from '../types';
import { toolRegistry } from '../../tools/registry';
import { resolveValue } from '../context-resolver';
import { eventRepo } from '../../db/repositories';
import { traceLogger } from '../../observability/logger';
import crypto from 'crypto';

export async function executeToolNode(
  node: ToolNodeConfig,
  ctx: ExecutionContext
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);

  // Resolve tool
  const tool = toolRegistry.getTool(node.toolName, ctx.tenantId);
  if (!tool) {
    throw new WorkflowError(
      'TOOL_FAILURE',
      `Tool '${node.toolName}' not found in registry`,
      false
    );
  }

  // Idempotency key
  const idempotencyKey =
    node.idempotencyKey ??
    crypto
      .createHash('sha256')
      .update(`${ctx.runId}-${node.id}`)
      .digest('hex');

  // Resolve input mappings from context
  const resolvedInput = resolveValue(node.inputMapping, ctx);

  log.info('Executing tool node', { toolName: node.toolName, idempotencyKey });

  // Log tool call event
  await eventRepo.append({
    runId: ctx.runId,
    nodeId: node.id,
    type: 'TOOL_CALL',
    payload: { toolName: node.toolName, input: resolvedInput, idempotencyKey },
  });

  try {
    const result = await tool.execute(resolvedInput, {
      runId: ctx.runId,
      tenantId: ctx.tenantId,
      idempotencyKey,
    });

    await eventRepo.append({
      runId: ctx.runId,
      nodeId: node.id,
      type: 'TOOL_RESULT',
      payload: { toolName: node.toolName, result: result.data },
    });

    log.info('Tool node completed', { toolName: node.toolName });

    return { status: 'completed', output: result.data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('Tool node failed', { toolName: node.toolName, error: message });

    await eventRepo.append({
      runId: ctx.runId,
      nodeId: node.id,
      type: 'TOOL_RESULT',
      payload: { toolName: node.toolName, error: message, success: false },
    });

    throw new WorkflowError('TOOL_FAILURE', message, true); // retryable
  }
}
