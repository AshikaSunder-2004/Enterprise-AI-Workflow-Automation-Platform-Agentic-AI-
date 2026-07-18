import React from 'react';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  RUNNING:       { label: 'Running',        className: 'badge-running' },
  COMPLETED:     { label: 'Completed',      className: 'badge-completed' },
  FAILED:        { label: 'Failed',         className: 'badge-failed' },
  PENDING:       { label: 'Pending',        className: 'badge-pending' },
  PAUSED:        { label: 'Paused',         className: 'badge-paused' },
  WAITING_HUMAN: { label: 'Awaiting Human', className: 'badge-waiting_human' },
  CANCELLED:     { label: 'Cancelled',      className: 'badge-cancelled' },
  DRAFT:         { label: 'Draft',          className: 'badge-draft' },
  PUBLISHED:     { label: 'Published',      className: 'badge-published' },
  ARCHIVED:      { label: 'Archived',       className: 'badge-cancelled' },
};

interface StatusBadgeProps {
  status: string;
  dot?: boolean;
}

export function StatusBadge({ status, dot = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'badge-draft' };

  if (dot) {
    return (
      <span className={`badge ${cfg.className}`} style={{ padding: '2px 8px' }}>
        {cfg.label}
      </span>
    );
  }

  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}
