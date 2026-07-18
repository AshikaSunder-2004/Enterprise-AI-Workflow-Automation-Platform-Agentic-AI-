// ─── Auth ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | 'APPROVER';
  tenantId: string;
  tenantName: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ─── Workflows ─────────────────────────────────────────────

export type TriggerType = 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'WORKFLOW_OUTPUT';
export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  definition: WorkflowDefinition;
  status: VersionStatus;
  createdAt: string;
  publishedAt?: string;
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerConfig?: Record<string, unknown>;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
  versions: WorkflowVersion[];
}

// ─── DAG Definition ────────────────────────────────────────

export type NodeType = 'start' | 'end' | 'agent' | 'tool' | 'human' | 'branch' | 'parallel' | 'loop';

export interface BaseNodeData {
  id: string;
  type: NodeType;
  label: string;
  timeout?: number;
  retries?: number;
}

export interface AgentNodeData extends BaseNodeData {
  type: 'agent';
  goal: string;
  allowedTools: string[];
  maxIterations: number;
  budgetTokens?: number;
  outputKey: string;
}

export interface ToolNodeData extends BaseNodeData {
  type: 'tool';
  toolName: string;
  inputMapping: Record<string, unknown>;
  outputKey: string;
}

export interface HumanNodeData extends BaseNodeData {
  type: 'human';
  prompt: string;
  assignTo?: string;
  outputKey: string;
}

export interface BranchNodeData extends BaseNodeData {
  type: 'branch';
  conditions: Array<{ id: string; expression: string; targetNodeId: string }>;
  defaultTargetNodeId: string;
}

export type NodeData = AgentNodeData | ToolNodeData | HumanNodeData | BranchNodeData | BaseNodeData;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: NodeData[];
  edges: WorkflowEdge[];
}

// ─── Runs ──────────────────────────────────────────────────

export type RunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_HUMAN'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  versionId: string;
  tenantId: string;
  status: RunStatus;
  currentNodeId?: string;
  context: Record<string, unknown>;
  triggerPayload?: unknown;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

// ─── Run Events (Audit Trail) ──────────────────────────────

export type RunEventType =
  | 'STATE_TRANSITION'
  | 'NODE_STARTED'
  | 'NODE_COMPLETED'
  | 'NODE_FAILED'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'AGENT_REASONING'
  | 'AGENT_TOOL_CALL'
  | 'AGENT_RESULT'
  | 'HUMAN_INPUT_REQUESTED'
  | 'HUMAN_INPUT_RECEIVED'
  | 'POLICY_VIOLATION'
  | 'ERROR';

export interface RunEvent {
  id: string;
  runId: string;
  nodeId?: string;
  type: RunEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ─── Human Tasks ───────────────────────────────────────────

export interface HumanTask {
  id: string;
  runId: string;
  nodeId: string;
  prompt: string;
  context?: Record<string, unknown>;
  assignedTo?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  response?: unknown;
  resolvedAt?: string;
  createdAt: string;
}

// ─── Tools ─────────────────────────────────────────────────

export interface Tool {
  name: string;
  version: string;
  description: string;
  category: string;
  requiredScopes: string[];
  inputSchema: Record<string, unknown>;
}

// ─── Analytics ─────────────────────────────────────────────

export interface CostSummary {
  model: string;
  _sum: { totalTokens: number | null; costUsd: string | null };
}
