// ─────────────────────────────────────────────
// Workflow DAG Definition Types
// ─────────────────────────────────────────────

export type NodeType =
  | 'agent'
  | 'tool'
  | 'human'
  | 'branch'
  | 'parallel'
  | 'loop'
  | 'subworkflow'
  | 'start'
  | 'end';

export interface BaseNode {
  id: string;
  type: NodeType;
  label: string;
  timeout?: number;        // ms
  retries?: number;
  retryDelay?: number;     // ms, exponential base
  idempotencyKey?: string; // template: can reference context vars
}

export interface AgentNodeConfig extends BaseNode {
  type: 'agent';
  goal: string;                  // Natural language goal
  allowedTools: string[];        // Tool names from registry
  maxIterations: number;
  budgetTokens?: number;
  agentType?: string;            // 'default' | 'research' | 'data-entry' | etc.
  systemPrompt?: string;         // Additional system instructions
  outputKey: string;             // Key to store result in context
}

export interface ToolNodeConfig extends BaseNode {
  type: 'tool';
  toolName: string;
  inputMapping: Record<string, unknown>; // Static or template values from context
  outputKey: string;
}

export interface HumanNodeConfig extends BaseNode {
  type: 'human';
  prompt: string;                 // Template string — can reference context
  assignTo?: string;             // User ID or email
  outputKey: string;
  timeoutAction?: 'fail' | 'skip';
}

export interface BranchNodeConfig extends BaseNode {
  type: 'branch';
  conditions: Array<{
    id: string;
    expression: string;  // e.g. "context.score > 0.8"
    targetNodeId: string;
  }>;
  defaultTargetNodeId: string;
}

export interface ParallelNodeConfig extends BaseNode {
  type: 'parallel';
  branches: string[][];  // Array of node sequences to run in parallel
  joinStrategy: 'wait_all' | 'wait_first';
}

export interface LoopNodeConfig extends BaseNode {
  type: 'loop';
  bodyNodeIds: string[];
  exitCondition: string;   // JS expression against context
  maxIterations: number;
  iterationCountKey: string;
}

export interface SubworkflowNodeConfig extends BaseNode {
  type: 'subworkflow';
  workflowId: string;
  versionId?: string;     // If undefined, uses published version
  inputMapping: Record<string, unknown>;
  outputKey: string;
}

export interface StartNodeConfig extends BaseNode {
  type: 'start';
}

export interface EndNodeConfig extends BaseNode {
  type: 'end';
}

export type NodeConfig =
  | AgentNodeConfig
  | ToolNodeConfig
  | HumanNodeConfig
  | BranchNodeConfig
  | ParallelNodeConfig
  | LoopNodeConfig
  | SubworkflowNodeConfig
  | StartNodeConfig
  | EndNodeConfig;

export interface WorkflowEdge {
  id: string;
  source: string;         // Node ID
  target: string;         // Node ID
  sourceHandle?: string;  // For branch nodes
  label?: string;
}

export interface WorkflowDefinition {
  nodes: NodeConfig[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>; // Global workflow variables
}

// ─────────────────────────────────────────────
// Execution Context
// ─────────────────────────────────────────────

export interface ExecutionContext {
  runId: string;
  tenantId: string;
  workflowId: string;
  triggerPayload: unknown;
  variables: Record<string, unknown>; // Accumulated step outputs
  iteration?: number;
}

// ─────────────────────────────────────────────
// Node Execution Result
// ─────────────────────────────────────────────

export type NodeResult =
  | { status: 'completed'; output: unknown; nextNodeId?: string }
  | { status: 'waiting_human'; taskId: string }
  | { status: 'failed'; error: string; retryable: boolean }
  | { status: 'branched'; nextNodeId: string }
  | { status: 'parallel_done'; outputs: Record<string, unknown> };

// ─────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────

export type ErrorType =
  | 'VALIDATION_ERROR'
  | 'TOOL_FAILURE'
  | 'TIMEOUT'
  | 'BUDGET_EXCEEDED'
  | 'POLICY_VIOLATION'
  | 'AGENT_MAX_ITERATIONS'
  | 'SCHEMA_VALIDATION'
  | 'NETWORK_ERROR'
  | 'HUMAN_REJECTED'
  | 'WORKFLOW_NOT_FOUND'
  | 'INTERNAL_ERROR';

export class WorkflowError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}
