import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node, Edge, addEdge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, Connection, BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowApi, analyticsApi } from '../api/client';
import { Tool, WorkflowDefinition } from '../types';
import { AgentFlowNode } from '../components/canvas/AgentFlowNode';
import { ToolFlowNode } from '../components/canvas/ToolFlowNode';
import { HumanFlowNode } from '../components/canvas/HumanFlowNode';
import { StartEndFlowNode } from '../components/canvas/StartEndFlowNode';
import { NodeConfigPanel } from '../components/canvas/NodeConfigPanel';
import { v4 as uuid } from 'uuid';
import { ChevronLeft, Save, Rocket, Bot, Wrench, UserCheck, GitBranch } from 'lucide-react';

const nodeTypes = {
  agent: AgentFlowNode,
  tool: ToolFlowNode,
  human: HumanFlowNode,
  start: StartEndFlowNode,
  end: StartEndFlowNode,
  branch: ToolFlowNode,
};

const defaultNodes: Node[] = [
  { id: 'start-1', type: 'start', position: { x: 300, y: 80 }, data: { id: 'start-1', type: 'start', label: 'Start' } },
  { id: 'end-1', type: 'end', position: { x: 300, y: 500 }, data: { id: 'end-1', type: 'end', label: 'End' } },
];

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [description, setDescription] = useState('');
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(isNew ? null : id ?? null);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    analyticsApi.tools().then((r) => setAvailableTools(r.tools));

    if (!isNew && id) {
      workflowApi.get(id).then((r) => {
        setWorkflowName(r.workflow.name);
        setDescription(r.workflow.description ?? '');
        const def = r.workflow.versions[0]?.definition as WorkflowDefinition | undefined;
        if (def) {
          setNodes(def.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: (n as { position?: { x: number; y: number } }).position ?? { x: 200, y: 200 },
            data: n,
          })));
          setEdges(def.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label })));
        }
      });
    }
  }, [id]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, id: uuid() }, eds)),
    []
  );

  const addNode = (type: string) => {
    const newNode: Node = {
      id: uuid(),
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: {
        id: uuid(),
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1) + ' Step',
        ...(type === 'agent' ? { goal: '', allowedTools: [], maxIterations: 10, outputKey: 'agent_output' } : {}),
        ...(type === 'tool' ? { toolName: '', inputMapping: {}, outputKey: 'tool_output' } : {}),
        ...(type === 'human' ? { prompt: 'Please review and approve', outputKey: 'human_response' } : {}),
        ...(type === 'branch' ? { conditions: [], defaultTargetNodeId: '' } : {}),
      },
    };
    setNodes((ns) => [...ns, newNode]);
  };

  const updateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes((ns) =>
      ns.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  };

  const buildDefinition = (): WorkflowDefinition => ({
    nodes: nodes.map((n) => ({ ...n.data, position: n.position })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: (e.label as string | undefined) })),
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const definition = buildDefinition();
      if (isNew || !workflowId) {
        const res = await workflowApi.create({ name: workflowName, description, definition });
        setWorkflowId(res.workflow.id);
        navigate(`/builder/${res.workflow.id}`, { replace: true });
        setSaveMsg('Saved!');
      } else {
        await workflowApi.update(workflowId, { name: workflowName, description, definition });
        setSaveMsg('Saved!');
      }
    } catch (err: unknown) {
      setSaveMsg('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handlePublish = async () => {
    if (!workflowId) { await handleSave(); return; }
    setPublishing(true);
    try {
      await workflowApi.publish(workflowId);
      setSaveMsg('Published!');
    } catch (err: unknown) {
      setSaveMsg('Publish failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setPublishing(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const nodeTypeOptions = [
    { type: 'agent', icon: <Bot size={15} />, label: 'AI Agent', color: '#6366f1', desc: 'LLM-powered step' },
    { type: 'tool', icon: <Wrench size={15} />, label: 'Tool Call', color: '#06b6d4', desc: 'External integration' },
    { type: 'human', icon: <UserCheck size={15} />, label: 'Human Task', color: '#f97316', desc: 'Approval gate' },
    { type: 'branch', icon: <GitBranch size={15} />, label: 'Branch', color: '#10b981', desc: 'Conditional logic' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-surface)', flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/workflows')}>
          <ChevronLeft size={15} /> Back
        </button>
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, width: 240 }}
          id="workflow-name-input"
        />
        <div className="ml-auto flex gap-2 items-center">
          {saveMsg && <span style={{ fontSize: '0.8rem', color: saveMsg.includes('failed') ? 'var(--color-error)' : 'var(--color-success)' }}>{saveMsg}</span>}
          <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saving} id="save-workflow-btn">
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Save size={14} /> Save</>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing} id="publish-workflow-btn">
            {publishing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Rocket size={14} /> Publish</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Node Palette */}
        <div style={{ width: 210, background: 'var(--color-bg-surface)', borderRight: '1px solid var(--color-border)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', overflowY: 'auto' }}>
          <div className="nav-section-title">Add Nodes</div>
          {nodeTypeOptions.map(({ type, icon, label, color, desc }) => (
            <button
              key={type}
              className="btn btn-secondary palette-node-btn"
              style={{ justifyContent: 'flex-start', gap: 10, fontSize: '0.8rem', borderColor: `${color}40`, padding: '10px 12px', height: 'auto', flexDirection: 'row', alignItems: 'flex-start' }}
              onClick={() => addNode(type)}
              id={`add-${type}-node-btn`}
            >
              <span style={{ color, marginTop: 1 }}>{icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </button>
          ))}

          <div className="divider" />
          <div className="nav-section-title">Available Tools</div>
          {availableTools.map((tool) => (
            <div key={tool.name} style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-overlay)', fontSize: '0.72rem', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Wrench size={10} color="var(--color-brand-accent)" />
                {tool.name}
              </div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>{tool.category}</div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.04)" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const colors: Record<string, string> = { agent: '#6366f1', tool: '#06b6d4', human: '#f97316', branch: '#10b981', start: '#8b5cf6', end: '#ef4444' };
                return colors[n.type ?? ''] ?? '#4a5568';
              }}
            />
            <Panel position="top-right">
              <div className="card-glass" style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {nodes.length} nodes · {edges.length} edges
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Node Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            availableTools={availableTools}
            allNodes={nodes}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
