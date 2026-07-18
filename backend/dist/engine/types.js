"use strict";
// ─────────────────────────────────────────────
// Workflow DAG Definition Types
// ─────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowError = void 0;
class WorkflowError extends Error {
    type;
    retryable;
    details;
    constructor(type, message, retryable = false, details) {
        super(message);
        this.type = type;
        this.retryable = retryable;
        this.details = details;
        this.name = 'WorkflowError';
    }
}
exports.WorkflowError = WorkflowError;
//# sourceMappingURL=types.js.map