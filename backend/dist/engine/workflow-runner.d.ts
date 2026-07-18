import { WorkflowDefinition, ExecutionContext } from './types';
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
export declare function executeWorkflow(opts: RunnerOptions): Promise<void>;
//# sourceMappingURL=workflow-runner.d.ts.map