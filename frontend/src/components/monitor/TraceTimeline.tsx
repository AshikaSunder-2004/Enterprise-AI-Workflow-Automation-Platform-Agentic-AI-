import React, { useState } from 'react';
import { RunEvent } from '../../types';
import { formatRelativeTime } from '../../utils/time';

const EVENT_COLORS: Record<string, string> = {
  STATE_TRANSITION:     '#6366f1',
  NODE_STARTED:         '#06b6d4',
  NODE_COMPLETED:       '#10b981',
  NODE_FAILED:          '#ef4444',
  TOOL_CALL:            '#8b5cf6',
  TOOL_RESULT:          '#a78bfa',
  AGENT_REASONING:      '#3b82f6',
  AGENT_TOOL_CALL:      '#8b5cf6',
  AGENT_RESULT:         '#10b981',
  HUMAN_INPUT_REQUESTED:'#f97316',
  HUMAN_INPUT_RECEIVED: '#10b981',
  POLICY_VIOLATION:     '#ef4444',
  ERROR:                '#ef4444',
};

const EVENT_ICONS: Record<string, string> = {
  STATE_TRANSITION:     '⚡',
  NODE_STARTED:         '▶',
  NODE_COMPLETED:       '✓',
  NODE_FAILED:          '✕',
  TOOL_CALL:            '🔧',
  TOOL_RESULT:          '📦',
  AGENT_REASONING:      '🧠',
  AGENT_TOOL_CALL:      '🔧',
  AGENT_RESULT:         '✓',
  HUMAN_INPUT_REQUESTED:'👤',
  HUMAN_INPUT_RECEIVED: '✅',
  POLICY_VIOLATION:     '🛡',
  ERROR:                '❌',
};

interface TraceTimelineProps {
  events: RunEvent[];
}

export function TraceTimeline({ events }: TraceTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="trace-timeline">
      {events.map((event, idx) => {
        const color = EVENT_COLORS[event.type] ?? '#4a5568';
        const icon = EVENT_ICONS[event.type] ?? '•';
        const isExpanded = expanded.has(event.id);

        return (
          <div key={event.id} className="trace-event" onClick={() => toggle(event.id)}>
            {/* Timeline line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
              {idx < events.length - 1 && (
                <div style={{ width: 1, flex: 1, background: 'var(--color-border)', marginTop: 4 }} />
              )}
            </div>

            <div className="trace-event-body">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                <span className="trace-event-type" style={{ color }}>
                  {event.type.replace(/_/g, ' ')}
                </span>
                {event.nodeId && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-overlay)', padding: '1px 6px', borderRadius: 4 }}>
                    {event.nodeId.slice(0, 8)}
                  </span>
                )}
                <span className="trace-event-meta ml-auto">{formatRelativeTime(event.createdAt)}</span>
              </div>

              {/* Quick preview */}
              {!isExpanded && event.payload && Object.keys(event.payload).length > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {getEventSummary(event)}
                </div>
              )}

              {/* Expanded payload */}
              {isExpanded && (
                <pre className="trace-payload">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getEventSummary(event: RunEvent): string {
  const p = event.payload;
  switch (event.type) {
    case 'AGENT_REASONING':
      return (p.reasoning as string) ? (p.reasoning as string).slice(0, 100) + '...' : '';
    case 'TOOL_CALL':
    case 'AGENT_TOOL_CALL':
      return `Calling ${p.toolName}`;
    case 'TOOL_RESULT':
      return p.success ? '✓ Success' : `✕ ${p.error}`;
    case 'NODE_FAILED':
      return `Error: ${p.error}`;
    case 'STATE_TRANSITION':
      return `Status → ${p.status}`;
    case 'HUMAN_INPUT_REQUESTED':
      return p.prompt as string ?? 'Human input requested';
    default:
      return '';
  }
}
