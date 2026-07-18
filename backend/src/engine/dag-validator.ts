import {
  WorkflowDefinition,
  WorkflowEdge,
  NodeConfig,
  WorkflowError,
} from './types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflowDefinition(def: WorkflowDefinition): ValidationResult {
  const errors: string[] = [];

  // 1. Must have at least start + end + one work node
  const startNodes = def.nodes.filter((n) => n.type === 'start');
  const endNodes = def.nodes.filter((n) => n.type === 'end');

  if (startNodes.length !== 1) {
    errors.push('Workflow must have exactly one start node');
  }
  if (endNodes.length < 1) {
    errors.push('Workflow must have at least one end node');
  }

  // 2. No duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of def.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // 3. All edge source/target IDs must reference existing nodes
  for (const edge of def.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references unknown source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references unknown target node: ${edge.target}`);
    }
  }

  // 4. Cycle detection using DFS (only for non-loop nodes)
  if (errors.length === 0) {
    const cycleErrors = detectCycles(def.nodes, def.edges);
    errors.push(...cycleErrors);
  }

  // 5. Validate each node's required fields
  for (const node of def.nodes) {
    const nodeErrors = validateNode(node);
    errors.push(...nodeErrors);
  }

  // 6. All nodes (except end) must have at least one outgoing edge
  const edgeSources = new Set(def.edges.map((e) => e.source));
  for (const node of def.nodes) {
    if (node.type !== 'end' && !edgeSources.has(node.id)) {
      errors.push(`Node ${node.id} (${node.type}) has no outgoing edge`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function detectCycles(nodes: NodeConfig[], edges: WorkflowEdge[]): string[] {
  const errors: string[] = [];
  const loopNodeIds = new Set(nodes.filter((n) => n.type === 'loop').map((n) => n.id));

  // Build adjacency list, skip loop back-edges
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    // Skip edges that go into loop nodes (legitimate back-edges)
    if (!loopNodeIds.has(edge.target)) {
      adj.get(edge.source)?.push(edge.target);
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  nodes.forEach((n) => color.set(n.id, WHITE));

  const dfs = (nodeId: string): boolean => {
    color.set(nodeId, GRAY);
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (color.get(neighbor) === GRAY) return true; // back-edge = cycle
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  };

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) {
      if (dfs(node.id)) {
        errors.push('Workflow DAG contains a cycle (use a loop node for intentional loops)');
        break;
      }
    }
  }

  return errors;
}

function validateNode(node: NodeConfig): string[] {
  const errors: string[] = [];
  const prefix = `Node ${node.id} (${node.type})`;

  switch (node.type) {
    case 'agent':
      if (!node.goal) errors.push(`${prefix}: goal is required`);
      if (!node.allowedTools?.length) errors.push(`${prefix}: allowedTools cannot be empty`);
      if (!node.outputKey) errors.push(`${prefix}: outputKey is required`);
      if (node.maxIterations < 1 || node.maxIterations > 50) {
        errors.push(`${prefix}: maxIterations must be between 1 and 50`);
      }
      break;

    case 'tool':
      if (!node.toolName) errors.push(`${prefix}: toolName is required`);
      if (!node.outputKey) errors.push(`${prefix}: outputKey is required`);
      break;

    case 'human':
      if (!node.prompt) errors.push(`${prefix}: prompt is required`);
      if (!node.outputKey) errors.push(`${prefix}: outputKey is required`);
      break;

    case 'branch':
      if (!node.conditions?.length) errors.push(`${prefix}: at least one condition is required`);
      if (!node.defaultTargetNodeId) errors.push(`${prefix}: defaultTargetNodeId is required`);
      break;

    case 'loop':
      if (!node.exitCondition) errors.push(`${prefix}: exitCondition is required`);
      if (node.maxIterations < 1) errors.push(`${prefix}: maxIterations must be >= 1`);
      break;

    case 'subworkflow':
      if (!node.workflowId) errors.push(`${prefix}: workflowId is required`);
      if (!node.outputKey) errors.push(`${prefix}: outputKey is required`);
      break;
  }

  return errors;
}
