import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowApi } from '../api/client';
import { Workflow } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { formatRelativeTime } from '../utils/time';
import { Plus, Pencil, Play, Trash2, Zap } from 'lucide-react';

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  useEffect(() => {
    workflowApi.list().then((r) => setWorkflows(r.workflows)).finally(() => setLoading(false));
  }, []);

  const handleTrigger = async (wf: Workflow) => {
    setTriggering(wf.id);
    try {
      const res = await workflowApi.trigger(wf.id);
      navigate(`/runs/${res.runId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to trigger');
    } finally {
      setTriggering(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    await workflowApi.delete(id);
    setWorkflows((wfs) => wfs.filter((w) => w.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">Design and manage your AI automation workflows</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" id="create-workflow-btn" onClick={() => navigate('/builder/new')}>
            <Plus size={15} />
            New Workflow
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : workflows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Zap size={48} /></div>
          <div className="empty-title">No workflows yet</div>
          <div className="empty-desc">Create your first AI workflow to get started</div>
          <button className="btn btn-primary" onClick={() => navigate('/builder/new')}>
            <Plus size={15} /> Create Workflow
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger</th>
                <th>Version</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => {
                const latestVersion = wf.versions[0];
                return (
                  <tr key={wf.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Zap size={14} color="var(--color-brand-primary)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{wf.name}</div>
                          {wf.description && <div className="text-muted text-sm">{wf.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{wf.triggerType}</span></td>
                    <td><span style={{ color: 'var(--color-text-muted)' }}>v{latestVersion?.version ?? '—'}</span></td>
                    <td><StatusBadge status={latestVersion?.status ?? 'DRAFT'} /></td>
                    <td className="text-muted">{formatRelativeTime(wf.updatedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/builder/${wf.id}`)}
                          id={`edit-workflow-${wf.id}`}
                          title="Edit"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        {latestVersion?.status === 'PUBLISHED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleTrigger(wf)}
                            disabled={triggering === wf.id}
                            id={`trigger-workflow-${wf.id}`}
                            title="Run"
                          >
                            {triggering === wf.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Play size={13} /> Run</>}
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(wf.id)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
