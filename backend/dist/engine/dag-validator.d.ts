import { WorkflowDefinition } from './types';
interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateWorkflowDefinition(def: WorkflowDefinition): ValidationResult;
export {};
//# sourceMappingURL=dag-validator.d.ts.map