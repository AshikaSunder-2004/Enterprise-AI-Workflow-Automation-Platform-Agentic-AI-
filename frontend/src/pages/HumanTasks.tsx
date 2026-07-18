import React, { useEffect, useState } from 'react';
import { runApi } from '../api/client';
import { HumanTask } from '../types';
import { formatRelativeTime } from '../utils/time';
import { UserCheck, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export function HumanTasksPage() {
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    runApi.pendingHumanTasks().then((r) => setTasks(r.tasks)).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (taskId: string) => {
    setProcessing(taskId);
    try {
      const input = inputValues[taskId] ? { notes: inputValues[taskId] } : undefined;
      await runApi.approveTask(taskId, input);
      setTasks((ts) => ts.filter((t) => t.id !== taskId));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (taskId: string) => {
    setProcessing(taskId);
    try {
      await runApi.rejectTask(taskId, inputValues[taskId] ?? 'Rejected by approver');
      setTasks((ts) => ts.filter((t) => t.id !== taskId));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Human Tasks</h1>
          <p className="page-subtitle">Review and approve workflow decisions</p>
        </div>
        <div style={{ background: 'var(--color-human)', borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserCheck size={14} />
          {tasks.length} pending
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ color: 'var(--color-success)', opacity: 0.6 }}><ShieldCheck size={48} /></div>
          <div className="empty-title">No pending tasks</div>
          <div className="empty-desc">All human approval tasks have been handled</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={18} color="var(--color-human)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Human Input Required</div>
                    <div className="text-muted text-sm">Run: <span className="font-mono">{task.runId.slice(0, 8)}...</span> · {formatRelativeTime(task.createdAt)}</div>
                  </div>
                </div>
                <span className="badge badge-waiting_human">Pending</span>
              </div>

              <div style={{ background: 'var(--color-bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', borderLeft: '3px solid var(--color-human)' }}>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{task.prompt}</p>
              </div>

              {task.context && Object.keys(task.context).length > 0 && (
                <details style={{ marginBottom: 'var(--space-4)' }}>
                  <summary className="text-muted text-sm" style={{ cursor: 'pointer' }}>View Context</summary>
                  <pre className="trace-payload" style={{ marginTop: 8 }}>{JSON.stringify(task.context, null, 2)}</pre>
                </details>
              )}

              <div className="form-group">
                <label className="form-label">Notes / Response (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={inputValues[task.id] ?? ''}
                  onChange={(e) => setInputValues((iv) => ({ ...iv, [task.id]: e.target.value }))}
                  placeholder="Add notes or additional input..."
                  id={`human-task-input-${task.id}`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(task.id)}
                  disabled={processing === task.id}
                  id={`approve-task-${task.id}`}
                >
                  {processing === task.id ? <span className="spinner" /> : <><CheckCircle2 size={15} /> Approve &amp; Resume</>}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(task.id)}
                  disabled={processing === task.id}
                  id={`reject-task-${task.id}`}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
