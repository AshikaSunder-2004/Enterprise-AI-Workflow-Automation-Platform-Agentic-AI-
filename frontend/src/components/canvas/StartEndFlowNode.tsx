import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play, Square } from 'lucide-react';

export const StartEndFlowNode = memo(({ data, selected }: { data: { label: string; type: string }; selected: boolean }) => {
  const isStart = data.type === 'start';
  const color = isStart ? '#8b5cf6' : '#ef4444';
  const Icon = isStart ? Play : Square;

  return (
    <div style={{
      background: selected ? `${color}22` : `${color}11`,
      border: `2px solid ${selected ? color : `${color}66`}`,
      borderRadius: '50%',
      width: 72, height: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: selected ? `0 0 20px ${color}44` : '0 2px 8px rgba(0,0,0,0.3)',
      flexDirection: 'column', gap: 2,
    }}>
      {!isStart && <Handle type="target" position={Position.Top} style={{ background: color, border: '2px solid #0d1117' }} />}
      <Icon size={18} color={color} fill={isStart ? color : 'none'} strokeWidth={isStart ? 0 : 2} />
      <span style={{ fontSize: '0.58rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.label}</span>
      {isStart && <Handle type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #0d1117' }} />}
    </div>
  );
});
