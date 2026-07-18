import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { runApi } from '../api/client';
import { WorkflowRun, RunEvent } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { TraceTimeline } from '../components/monitor/TraceTimeline';
import { createRunWebSocket } from '../api/client';
import { formatRelativeTime } from '../utils/time';
import { ChevronLeft, XCircle, AlertTriangle, ListOrdered, SearchX } from 'lucide-react';

export function RunMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!id) return;

    // Load initial state
    Promise.all([runApi.get(id), runApi.trace(id)]).then(([rRes, tRes]) => {
      setRun(rRes.run);
      setEvents(tRes.events);
    }).finally(() => setLoading(false));

    // WebSocket for live updates
    try {
      const ws = createRunWebSocket((data: unknown) => {
        const msg = data as { type: string; runId?: string; status?: string };
        if (msg.runId !== id) return;

        if (msg.type === 'run_completed' || msg.type === 'run_failed') {
          runApi.get(id).then((r) => setRun(r.run));
        }

        if (msg.type === 'node_started' || msg.type === 'node_completed' || msg.type === 'agent_reasoning') {
          runApi.trace(id).then((r) => setEvents(r.events));
        }

        if (msg.status) {
          setRun((prev) => prev ? { ...prev, status: msg.status as WorkflowRun['status'] } : prev);
        }
      });

      wsRef.current = ws;
    } catch {}

    return () => wsRef.current?.close();
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await runApi.cancel(id);
      setRun((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <div className="skeleton" style={{ height: 120, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ color: 'var(--color-error)', opacity: 0.6 }}><SearchX size={48} /></div>
        <div className="empty-title">Run not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/runs')}>
          <ChevronLeft size={15} /> Back to Runs
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/runs')}>
              <ChevronLeft size={15} /> Runs
            </button>
            <h1 className="page-title">Run Monitor</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="page-subtitle" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            {run.id}
          </p>
        </div>
        {['RUNNING', 'PENDING', 'PAUSED'].includes(run.status) && (
          <button className="btn btn-danger btn-sm" onClick={handleCancel} id="cancel-run-btn">
            <XCircle size={14} /> Cancel Run
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="stat-label">Started</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatRelativeTime(run.startedAt)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Status</div>
          <StatusBadge status={run.status} />
        </div>
        <div className="card">
          <div className="stat-label">Current Node</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            {run.currentNodeId ?? '—'}
          </div>
        </div>
      </div>

      {run.errorMessage && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'var(--color-error-bg)', marginBottom: 'var(--space-4)' }}>
          <div style={{ color: 'var(--color-error)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} /> Error
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            {run.errorMessage}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-5)' }}>
        {/* Trace Timeline */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h3>Execution Trace</h3>
            <span className="text-muted text-sm">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-icon" style={{ opacity: 0.4 }}><ListOrdered size={40} /></div>
              <div className="empty-title">No events yet</div>
            </div>
          ) : (
            <TraceTimeline events={events} />
          )}
        </div>

        {/* Context Output */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Execution Context</h3>
          <pre className="trace-payload" style={{ maxHeight: 500 }}>
            {JSON.stringify(run.context, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
