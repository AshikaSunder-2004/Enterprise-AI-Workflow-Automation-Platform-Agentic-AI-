import { ParallelNodeConfig, ExecutionContext, WorkflowDefinition, NodeResult } from '../types';
import { executeNode } from './index';
import { buildNodeMap } from '../context-resolver';
import { traceLogger } from '../../observability/logger';

export async function executeParallelNode(
  node: ParallelNodeConfig,
  ctx: ExecutionContext,
  definition: WorkflowDefinition
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);
  const nodeMap = buildNodeMap(definition);

  log.info('Executing parallel branches', { branches: node.branches.length });

  const branchPromises = node.branches.map(async (nodeSequence, branchIndex) => {
    // Create a copy of context for each branch
    const branchCtx: ExecutionContext = {
      ...ctx,
      variables: { ...ctx.variables },
    };

    const branchOutputs: Record<string, unknown> = {};

    for (const nodeId of nodeSequence) {
      const branchNode = nodeMap.get(nodeId);
      if (!branchNode) continue;

      const result = await executeNode(branchNode, branchCtx, definition);

      if (result.status === 'completed') {
        const outputKey = (branchNode as { outputKey?: string }).outputKey;
        if (outputKey && result.output !== undefined) {
          branchCtx.variables[outputKey] = result.output;
          branchOutputs[outputKey] = result.output;
        }
      } else if (result.status === 'failed') {
        throw new Error(`Branch ${branchIndex} failed at node ${nodeId}: ${result.error}`);
      }
    }

    return { branchIndex, outputs: branchOutputs };
  });

  let results;

  if (node.joinStrategy === 'wait_first') {
    const first = await Promise.race(branchPromises);
    results = [first];
  } else {
    // wait_all
    results = await Promise.all(branchPromises);
  }

  // Merge outputs from all branches into context
  const mergedOutputs: Record<string, unknown> = {};
  for (const result of results) {
    Object.assign(mergedOutputs, result.outputs);
  }

  return { status: 'parallel_done', outputs: mergedOutputs };
}
