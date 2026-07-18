import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

interface AgentNodeProps {
  data: { label: string; goal?: string; maxIterations?: number; allowedTools?: string[]; outputKey?: string };
  selected: boolean;
}

export const AgentFlowNode = memo(({ data, selected }: AgentNodeProps) => (
  <div style={{
    background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
    border: `1.5px solid ${selected ? '#6366f1' : 'rgba(99,102,241,0.4)'}`,
    borderRadius: 12,
    padding: '12px 16px',
    minWidth: 200,
    boxShadow: selected ? '0 0 16px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'all 0.15s ease',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#6366f1', border: '2px solid #0d1117' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: data.goal ? 8 : 0 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bot size={15} color="#a5b4fc" />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f0f4ff' }}>{data.label}</div>
        {data.maxIterations && (
          <div style={{ fontSize: '0.7rem', color: '#6366f1' }}>max {data.maxIterations} iter</div>
        )}
      </div>
    </div>
    {data.goal && (
      <div style={{ fontSize: '0.78rem', color: '#8892a4', borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 8, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.goal}
      </div>
    )}
    {data.allowedTools && data.allowedTools.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {data.allowedTools.slice(0, 3).map((t: string) => (
          <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.2)', color: '#a78bfa', padding: '1px 6px', borderRadius: 4 }}>{t}</span>
        ))}
        {data.allowedTools.length > 3 && <span style={{ fontSize: '0.65rem', color: '#6366f1' }}>+{data.allowedTools.length - 3}</span>}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: '2px solid #0d1117' }} />
  </div>
));
