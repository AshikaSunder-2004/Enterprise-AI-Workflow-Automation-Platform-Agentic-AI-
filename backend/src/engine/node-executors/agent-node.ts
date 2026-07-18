import { AgentNodeConfig, ExecutionContext, NodeResult, WorkflowError } from '../types';
import { runAgentExecutor } from '../../agent/executor';
import { traceLogger } from '../../observability/logger';

export async function executeAgentNode(
  node: AgentNodeConfig,
  ctx: ExecutionContext
): Promise<NodeResult> {
  const log = traceLogger(ctx.runId, node.id, ctx.tenantId);
  log.info('Starting agent node', { goal: node.goal, tools: node.allowedTools });

  const result = await runAgentExecutor({
    runId: ctx.runId,
    nodeId: node.id,
    tenantId: ctx.tenantId,
    goal: node.goal,
    context: ctx.variables,
    allowedTools: node.allowedTools,
    maxIterations: node.maxIterations,
    budgetTokens: node.budgetTokens,
    systemPrompt: node.systemPrompt,
  });

  switch (result.status) {
    case 'completed':
      log.info('Agent node completed', { iterationsUsed: result.iterationsUsed });
      return { status: 'completed', output: result.output };

    case 'human_escalation':
      // Human escalation from within the agent — the human-node executor handles the task creation.
      // Here we pause the run.
      log.info('Agent escalated to human', { reason: result.humanEscalationReason });
      // Create a synthetic human task
      const { humanTaskRepo } = await import('../../db/repositories');
      const task = await humanTaskRepo.create({
        run: { connect: { id: ctx.runId } },
        nodeId: node.id,
        prompt: result.humanEscalationReason ?? 'Agent requires human input to proceed',
        context: ctx.variables as object,
        status: 'PENDING',
      });
      return { status: 'waiting_human', taskId: task.id };

    case 'budget_exceeded':
      throw new WorkflowError(
        'BUDGET_EXCEEDED',
        `Agent budget exceeded after ${result.iterationsUsed} iterations`,
        false
      );

    case 'max_iterations':
      throw new WorkflowError(
        'AGENT_MAX_ITERATIONS',
        `Agent reached max iterations (${node.maxIterations}) without completing goal`,
        false
      );

    case 'error':
    default:
      throw new WorkflowError('INTERNAL_ERROR', 'Agent executor encountered an error', true);
  }
}
