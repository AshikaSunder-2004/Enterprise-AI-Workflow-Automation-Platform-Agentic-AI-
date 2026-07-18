import { validateWorkflowDefinition } from '../../../src/engine/dag-validator';
import { WorkflowDefinition } from '../../../src/engine/types';

describe('DAG Validator', () => {
  const validDef: WorkflowDefinition = {
    nodes: [
      { id: 'start-1', type: 'start', label: 'Start' },
      { id: 'agent-1', type: 'agent', label: 'Agent', goal: 'Do something', allowedTools: ['web_search'], maxIterations: 5, outputKey: 'result' },
      { id: 'end-1', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'agent-1' },
      { id: 'e2', source: 'agent-1', target: 'end-1' },
    ],
  };

  test('should validate a correct workflow', () => {
    const result = validateWorkflowDefinition(validDef);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject workflow without start node', () => {
    const def: WorkflowDefinition = {
      nodes: [{ id: 'end-1', type: 'end', label: 'End' }],
      edges: [],
    };
    const result = validateWorkflowDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('start node'))).toBe(true);
  });

  test('should reject workflow with cycle', () => {
    const def: WorkflowDefinition = {
      nodes: [
        { id: 'start-1', type: 'start', label: 'Start' },
        { id: 'a', type: 'agent', label: 'A', goal: 'goal', allowedTools: [], maxIterations: 5, outputKey: 'o' },
        { id: 'b', type: 'agent', label: 'B', goal: 'goal', allowedTools: [], maxIterations: 5, outputKey: 'o' },
        { id: 'end-1', type: 'end', label: 'End' },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'a' },
        { id: 'e2', source: 'a', target: 'b' },
        { id: 'e3', source: 'b', target: 'a' }, // cycle!
        { id: 'e4', source: 'b', target: 'end-1' },
      ],
    };
    const result = validateWorkflowDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('cycle'))).toBe(true);
  });

  test('should reject agent node without goal', () => {
    const def: WorkflowDefinition = {
      nodes: [
        { id: 'start-1', type: 'start', label: 'Start' },
        { id: 'agent-1', type: 'agent', label: 'Agent', goal: '', allowedTools: ['web_search'], maxIterations: 5, outputKey: 'r' },
        { id: 'end-1', type: 'end', label: 'End' },
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'agent-1' },
        { id: 'e2', source: 'agent-1', target: 'end-1' },
      ],
    };
    const result = validateWorkflowDefinition(def);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('goal'))).toBe(true);
  });
});
