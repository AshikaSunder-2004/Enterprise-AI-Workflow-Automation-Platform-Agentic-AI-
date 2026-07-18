import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { runApi } from '../api/client';
import { WorkflowRun } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { formatRelativeTime, formatDuration } from '../utils/time';
import { Play, Eye } from 'lucide-react';

export function RunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    runApi.list().then((r) => setRuns(r.runs)).finally(() => setLoading(false));
  }, []);

  const filtered = filter ? runs.filter((r) => r.status === filter) : runs;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Runs</h1>
          <p className="page-subtitle">Monitor and manage workflow executions</p>
        </div>
        <div className="page-actions">
          <select className="form-control" style={{ width: 180 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['PENDING','RUNNING','COMPLETED','FAILED','WAITING_HUMAN','CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Play size={48} /></div>
          <div className="empty-title">No runs found</div>
          <div className="empty-desc">Trigger a published workflow to start a run</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Current Node</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/runs/${run.id}`)}>
                  <td>
                    <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {run.id.split('-')[0]}...
                    </span>
                  </td>
                  <td>
                    <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {run.workflowId.slice(0, 8)}...
                    </span>
                  </td>
                  <td><StatusBadge status={run.status} /></td>
                  <td className="text-muted text-sm">{formatRelativeTime(run.startedAt)}</td>
                  <td className="text-muted text-sm">{formatDuration(run.startedAt, run.completedAt)}</td>
                  <td>
                    {run.currentNodeId && (
                      <span className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {run.currentNodeId.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/runs/${run.id}`)}>
                      <Eye size={13} /> View Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
