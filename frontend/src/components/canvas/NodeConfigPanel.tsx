import React from 'react';
import { Node } from 'reactflow';
import { Tool } from '../../types';
import { X } from 'lucide-react';

interface Props {
  node: Node;
  availableTools: Tool[];
  allNodes: Node[];
  onUpdate: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, availableTools, allNodes, onUpdate, onClose }: Props) {
  const { data } = node;
  const type = data.type as string;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onUpdate({ [field]: e.target.value });

  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ [field]: Number(e.target.value) });

  const setTools = (toolName: string, checked: boolean) => {
    const current: string[] = data.allowedTools ?? [];
    onUpdate({ allowedTools: checked ? [...current, toolName] : current.filter((t: string) => t !== toolName) });
  };

  return (
    <div style={{
      width: 300, background: 'var(--color-bg-surface)', borderLeft: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>{type} Node</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{node.id.slice(0, 8)}</div>
        </div>
        <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {/* Config Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>

        {/* Label (all types) */}
        <div className="form-group">
          <label className="form-label">Label</label>
          <input className="form-control" value={data.label ?? ''} onChange={set('label')} id="node-label-input" />
        </div>

        {/* Agent specific */}
        {type === 'agent' && (
          <>
            <div className="form-group">
              <label className="form-label">Goal</label>
              <textarea className="form-control" rows={3} value={data.goal ?? ''} onChange={set('goal')} placeholder="Describe what the agent should accomplish..." id="agent-goal-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Max Iterations</label>
              <input className="form-control" type="number" min={1} max={50} value={data.maxIterations ?? 10} onChange={setNum('maxIterations')} id="agent-max-iter-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Output Key</label>
              <input className="form-control" value={data.outputKey ?? ''} onChange={set('outputKey')} placeholder="e.g. agent_result" />
            </div>
            <div className="form-group">
              <label className="form-label">Allowed Tools</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--color-bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                {availableTools.map((tool) => (
                  <label key={tool.name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input
                      type="checkbox"
                      checked={(data.allowedTools ?? []).includes(tool.name)}
                      onChange={(e) => setTools(tool.name, e.target.checked)}
                      id={`tool-toggle-${tool.name}`}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{tool.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">System Prompt (optional)</label>
              <textarea className="form-control" rows={2} value={data.systemPrompt ?? ''} onChange={set('systemPrompt')} placeholder="Additional instructions..." />
            </div>
          </>
        )}

        {/* Tool Node */}
        {type === 'tool' && (
          <>
            <div className="form-group">
              <label className="form-label">Tool</label>
              <select className="form-control" value={data.toolName ?? ''} onChange={set('toolName')} id="tool-select">
                <option value="">— Select a tool —</option>
                {availableTools.map((t) => (
                  <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Output Key</label>
              <input className="form-control" value={data.outputKey ?? ''} onChange={set('outputKey')} placeholder="e.g. tool_result" />
            </div>
            <div className="form-group">
              <label className="form-label">Input Mapping (JSON)</label>
              <textarea
                className="form-control"
                rows={4}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                value={typeof data.inputMapping === 'object' ? JSON.stringify(data.inputMapping, null, 2) : '{}'}
                onChange={(e) => {
                  try { onUpdate({ inputMapping: JSON.parse(e.target.value) }); } catch {}
                }}
                id="tool-input-mapping"
              />
            </div>
          </>
        )}

        {/* Human Node */}
        {type === 'human' && (
          <>
            <div className="form-group">
              <label className="form-label">Prompt</label>
              <textarea className="form-control" rows={3} value={data.prompt ?? ''} onChange={set('prompt')} placeholder="What should the human review or decide?" id="human-prompt-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Assign To (User ID or email)</label>
              <input className="form-control" value={data.assignTo ?? ''} onChange={set('assignTo')} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Output Key</label>
              <input className="form-control" value={data.outputKey ?? ''} onChange={set('outputKey')} placeholder="e.g. human_response" />
            </div>
          </>
        )}

        {/* Common: timeout & retries */}
        {!['start', 'end'].includes(type) && (
          <>
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Timeout (ms)</label>
                <input className="form-control" type="number" value={data.timeout ?? ''} onChange={setNum('timeout')} placeholder="30000" />
              </div>
              <div className="form-group">
                <label className="form-label">Retries</label>
                <input className="form-control" type="number" min={0} max={5} value={data.retries ?? 0} onChange={setNum('retries')} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
