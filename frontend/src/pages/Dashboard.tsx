import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workflowApi, runApi, analyticsApi } from '../api/client';
import { Workflow, WorkflowRun } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { formatRelativeTime } from '../utils/time';
import {
  Zap, Play, CheckCircle2, Activity, Clock, DollarSign, Plus, ArrowRight
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [cost, setCost] = useState<{ totalCost: number; totalTokens: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      workflowApi.list(),
      runApi.list(),
      analyticsApi.runStats(),
      analyticsApi.cost(30),
    ]).then(([wRes, rRes, sRes, cRes]) => {
      setWorkflows(wRes.workflows.slice(0, 5));
      setRecentRuns(rRes.runs.slice(0, 8));
      const statsMap: Record<string, number> = {};
      sRes.stats.forEach((s) => { statsMap[s.status] = s._count.id; });
      setStats(statsMap);
      setCost(cRes);
    }).finally(() => setLoading(false));
  }, []);

  const totalRuns = Object.values(stats).reduce((a, b) => a + b, 0);

  const statCards = [
    {
      label: 'Total Workflows',
      value: loading ? '—' : workflows.length,
      sub: 'Across all projects',
      icon: <Zap size={20} />,
      color: 'var(--color-brand-primary)',
    },
    {
      label: 'Total Runs',
      value: loading ? '—' : totalRuns,
      sub: 'All time',
      icon: <Play size={20} />,
      color: 'var(--color-info)',
    },
    {
      label: 'Success Rate',
      value: loading || !totalRuns ? '—' : `${Math.round(((stats.COMPLETED ?? 0) / totalRuns) * 100)}%`,
      sub: `${stats.COMPLETED ?? 0} completed`,
      icon: <CheckCircle2 size={20} />,
      color: 'var(--color-success)',
    },
    {
      label: 'Active Runs',
      value: loading ? '—' : (stats.RUNNING ?? 0),
      sub: 'Currently running',
      icon: <Activity size={20} />,
      color: 'var(--color-info)',
    },
    {
      label: 'Pending Approval',
      value: loading ? '—' : (stats.WAITING_HUMAN ?? 0),
      sub: 'Waiting for human',
      icon: <Clock size={20} />,
      color: 'var(--color-human)',
    },
    {
      label: 'AI Cost (30d)',
      value: loading || !cost ? '—' : `$${cost.totalCost.toFixed(4)}`,
      sub: cost ? `${(cost.totalTokens / 1000).toFixed(1)}k tokens` : '',
      icon: <DollarSign size={20} />,
      color: 'var(--color-brand-accent)',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your AI workflow automations</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" id="new-workflow-btn" onClick={() => navigate('/builder/new')}>
            <Plus size={15} />
            New Workflow
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-sub">{card.sub}</div>
            <div className="stat-icon" style={{ color: card.color }}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Recent Workflows */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h3>Workflows</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/workflows')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : workflows.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-icon"><Zap size={40} /></div>
              <div className="empty-title">No workflows yet</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/builder/new')}>
                <Plus size={13} /> Create your first
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="workflow-row-item"
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                >
                  <div className="workflow-row-icon">
                    <Zap size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 500, fontSize: '0.875rem' }}>{wf.name}</div>
                    <div className="text-muted text-sm">{wf.triggerType}</div>
                  </div>
                  <StatusBadge status={wf.versions[0]?.status ?? 'DRAFT'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h3>Recent Runs</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/runs')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-icon"><Play size={40} /></div>
              <div className="empty-title">No runs yet</div>
              <div className="empty-desc">Trigger a workflow to see runs here</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="workflow-row-item"
                  onClick={() => navigate(`/runs/${run.id}`)}
                >
                  <StatusBadge status={run.status} dot />
                  <div className="flex-col" style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                      {run.id.split('-')[0]}...
                    </div>
                  </div>
                  <div className="text-muted text-sm">{formatRelativeTime(run.startedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
