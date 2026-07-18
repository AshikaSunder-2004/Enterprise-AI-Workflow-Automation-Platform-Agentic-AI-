import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
export interface WorkflowJobData {
    runId: string;
    tenantId: string;
    workflowId: string;
    versionId: string;
}
export interface ResumeJobData {
    runId: string;
    tenantId: string;
    humanTaskId: string;
    decision: 'approved' | 'rejected';
    input: unknown;
}
declare const connection: Redis;
export declare const workflowQueue: Queue<WorkflowJobData, void, string, WorkflowJobData, void, string>;
export declare const resumeQueue: Queue<ResumeJobData, void, string, ResumeJobData, void, string>;
export declare function enqueueWorkflowRun(data: WorkflowJobData): Promise<string>;
export declare function enqueueResumeRun(data: ResumeJobData): Promise<void>;
export { connection as redisConnection };
//# sourceMappingURL=producer.d.ts.map