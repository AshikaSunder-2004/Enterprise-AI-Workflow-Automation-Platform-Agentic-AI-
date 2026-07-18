import { NodeConfig, ExecutionContext, WorkflowDefinition, NodeResult } from '../types';
import { executeAgentNode } from './agent-node';
import { executeToolNode } from './tool-node';
import { executeHumanNode } from './human-node';
import { executeBranchNode } from './branch-node';
import { executeParallelNode } from './parallel-node';
import { executeLoopNode } from './loop-node';
import { WorkflowError } from '../types';

export async function executeNode(
  node: NodeConfig,
  ctx: ExecutionContext,
  definition: WorkflowDefinition
): Promise<NodeResult> {
  switch (node.type) {
    case 'start':
      return { status: 'completed', output: null };
    case 'end':
      return { status: 'completed', output: null };
    case 'agent':
      return executeAgentNode(node, ctx);
    case 'tool':
      return executeToolNode(node, ctx);
    case 'human':
      return executeHumanNode(node, ctx);
    case 'branch':
      return executeBranchNode(node, ctx);
    case 'parallel':
      return executeParallelNode(node, ctx, definition);
    case 'loop':
      return executeLoopNode(node, ctx, definition);
    case 'subworkflow':
      // Subworkflow: enqueue as a child run, await completion
      throw new WorkflowError('INTERNAL_ERROR', 'Subworkflow nodes require orchestration via queue', false);
    default:
      throw new WorkflowError('INTERNAL_ERROR', `Unknown node type: ${(node as NodeConfig).type}`, false);
  }
}
