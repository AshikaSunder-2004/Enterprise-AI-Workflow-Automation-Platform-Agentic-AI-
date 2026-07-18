import { BranchNodeConfig, ExecutionContext, NodeResult } from '../types';
import { evaluateCondition } from '../context-resolver';
import { eventRepo } from '../../db/repositories';
import { traceLogger } from '../../observability/logger';

export async function executeBranchNode(
  node: BranchNodeConfig,
  ctx: ExecutionContext
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);

  for (const condition of node.conditions) {
    const result = evaluateCondition(condition.expression, ctx);
    log.debug('Evaluating branch condition', { expression: condition.expression, result });

    if (result) {
      await eventRepo.append({
        runId: ctx.runId,
        nodeId: node.id,
        type: 'NODE_COMPLETED',
        payload: {
          branch: 'condition_matched',
          conditionId: condition.id,
          expression: condition.expression,
          nextNodeId: condition.targetNodeId,
        },
      });

      return { status: 'branched', nextNodeId: condition.targetNodeId };
    }
  }

  // Default branch
  log.debug('No condition matched, taking default branch', { defaultTarget: node.defaultTargetNodeId });

  await eventRepo.append({
    runId: ctx.runId,
    nodeId: node.id,
    type: 'NODE_COMPLETED',
    payload: { branch: 'default', nextNodeId: node.defaultTargetNodeId },
  });

  return { status: 'branched', nextNodeId: node.defaultTargetNodeId };
}
