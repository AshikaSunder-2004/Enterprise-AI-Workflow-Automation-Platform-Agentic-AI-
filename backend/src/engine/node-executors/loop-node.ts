import { LoopNodeConfig, ExecutionContext, WorkflowDefinition, NodeResult, WorkflowError } from '../types';
import { executeNode } from './index';
import { buildNodeMap, evaluateCondition } from '../context-resolver';
import { traceLogger } from '../../observability/logger';

export async function executeLoopNode(
  node: LoopNodeConfig,
  ctx: ExecutionContext,
  definition: WorkflowDefinition
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);
  const nodeMap = buildNodeMap(definition);

  let iteration = 0;
  ctx.variables[node.iterationCountKey] = 0;

  log.info('Starting loop node', { exitCondition: node.exitCondition, maxIterations: node.maxIterations });

  while (iteration < node.maxIterations) {
    // Check exit condition before executing body
    if (iteration > 0 && evaluateCondition(node.exitCondition, ctx)) {
      log.info('Loop exit condition met', { iteration });
      break;
    }

    log.debug('Loop iteration', { iteration });
    ctx.variables[node.iterationCountKey] = iteration;

    for (const nodeId of node.bodyNodeIds) {
      const bodyNode = nodeMap.get(nodeId);
      if (!bodyNode) continue;

      const result = await executeNode(bodyNode, ctx, definition);

      if (result.status === 'completed') {
        const outputKey = (bodyNode as { outputKey?: string }).outputKey;
        if (outputKey && result.output !== undefined) {
          ctx.variables[outputKey] = result.output;
        }
      } else if (result.status === 'failed') {
        throw new WorkflowError('TOOL_FAILURE', result.error, result.retryable);
      } else if (result.status === 'waiting_human') {
        // Human pause inside a loop — uncommon but supported
        return result;
      }
    }

    iteration++;

    // Check exit condition after executing body
    if (evaluateCondition(node.exitCondition, ctx)) {
      log.info('Loop exit condition met after iteration', { iteration });
      break;
    }
  }

  if (iteration >= node.maxIterations) {
    log.warn('Loop reached max iterations', { maxIterations: node.maxIterations });
  }

  return {
    status: 'completed',
    output: { iterations: iteration, finalContext: ctx.variables },
  };
}
