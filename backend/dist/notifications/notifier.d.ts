interface NotifyPayload {
    type: 'human_task' | 'run_failed' | 'run_completed';
    taskId?: string;
    runId: string;
    tenantId: string;
    prompt?: string;
    assignedTo?: string;
    message?: string;
}
declare class Notifier {
    notify(payload: NotifyPayload): Promise<void>;
    private notifySlack;
}
export declare const notifier: Notifier;
export {};
//# sourceMappingURL=notifier.d.ts.map