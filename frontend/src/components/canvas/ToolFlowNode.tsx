import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Wrench, GitBranch, UserCheck } from 'lucide-react';

export const ToolFlowNode = memo(({ data, selected }: { data: { label: string; toolName?: string; type?: string }; selected: boolean }) => {
  const isBranch = data.type === 'branch';
  const color = isBranch ? '#10b981' : '#06b6d4';
  const Icon = isBranch ? GitBranch : Wrench;

  return (
    <div style={{
      background: selected ? `${color}22` : `${color}0d`,
      border: `1.5px solid ${selected ? color : `${color}55`}`,
      borderRadius: 12, padding: '12px 16px', minWidth: 180,
      boxShadow: selected ? `0 0 16px ${color}44` : '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color, border: '2px solid #0d1117' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={color} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f0f4ff' }}>{data.label}</div>
          {data.toolName && <div style={{ fontSize: '0.72rem', color }}>{data.toolName}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #0d1117' }} />
    </div>
  );
});

export const HumanFlowNode = memo(({ data, selected }: { data: { label: string; prompt?: string }; selected: boolean }) => (
  <div style={{
    background: selected ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.08)',
    border: `1.5px solid ${selected ? '#f97316' : 'rgba(249,115,22,0.4)'}`,
    borderRadius: 12, padding: '12px 16px', minWidth: 180,
    boxShadow: selected ? '0 0 16px rgba(249,115,22,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#f97316', border: '2px solid #0d1117' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <UserCheck size={14} color="#f97316" />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f0f4ff' }}>{data.label}</div>
        {data.prompt && <div style={{ fontSize: '0.72rem', color: '#8892a4', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.prompt}</div>}
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#f97316', border: '2px solid #0d1117' }} />
  </div>
));
