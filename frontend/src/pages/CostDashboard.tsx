import React, { useEffect, useState } from 'react';
import { analyticsApi } from '../api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Layers, TrendingDown, Play } from 'lucide-react';

export function CostDashboardPage() {
  const [cost, setCost] = useState<{ summary: { model: string; _sum: { totalTokens: number | null; costUsd: string | null } }[]; totalCost: number; totalTokens: number } | null>(null);
  const [stats, setStats] = useState<{ status: string; _count: { id: number } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.cost(30), analyticsApi.runStats()])
      .then(([c, s]) => { setCost(c); setStats(s.stats); })
      .finally(() => setLoading(false));
  }, []);

  const PIE_COLORS: Record<string, string> = {
    COMPLETED: '#10b981', FAILED: '#ef4444', RUNNING: '#3b82f6',
    PENDING: '#8b5cf6', WAITING_HUMAN: '#f97316', CANCELLED: '#4a5568',
  };

  const pieData = stats.map((s) => ({ name: s.status, value: s._count.id }));
  const totalRuns = stats.reduce((acc, s) => acc + s._count.id, 0);

  const statCards = [
    {
      label: 'Total AI Cost (30d)',
      value: `$${cost?.totalCost.toFixed(4) ?? '0.00'}`,
      sub: 'USD',
      icon: <DollarSign size={20} />,
      color: 'var(--color-brand-accent)',
    },
    {
      label: 'Tokens Used (30d)',
      value: cost ? `${(cost.totalTokens / 1000).toFixed(1)}k` : '0',
      sub: 'Total tokens',
      icon: <Layers size={20} />,
      color: 'var(--color-brand-primary)',
    },
    {
      label: 'Avg Cost / Run',
      value: cost && totalRuns ? `$${(cost.totalCost / totalRuns).toFixed(5)}` : '$0.00',
      sub: 'Per workflow run',
      icon: <TrendingDown size={20} />,
      color: 'var(--color-brand-accent)',
    },
    {
      label: 'Total Runs',
      value: totalRuns,
      sub: 'All time',
      icon: <Play size={20} />,
      color: 'var(--color-info)',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost &amp; Analytics</h1>
          <p className="page-subtitle">AI usage costs and workflow performance (last 30 days)</p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <>
          {/* Cost Summary */}
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
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
            {/* Run Status Distribution */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Run Status Distribution</h3>
              {pieData.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <div className="empty-desc">No run data yet</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#4a5568'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#161b27', border: '1px solid #1c2333', borderRadius: 8, color: '#f0f4ff', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#8892a4', fontSize: '0.8rem' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Cost by Model */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Cost by Model</h3>
              {!cost?.summary?.length ? (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <div className="empty-desc">No cost data yet</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cost.summary.map((s) => (
                    <div key={s.model} className="card" style={{ padding: 'var(--space-3)', marginBottom: 0 }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.model}</span>
                        <span style={{ color: 'var(--color-brand-accent)', fontWeight: 600, fontSize: '0.875rem' }}>
                          ${Number(s._sum.costUsd ?? 0).toFixed(5)}
                        </span>
                      </div>
                      <div className="text-muted text-sm">{((s._sum.totalTokens ?? 0) / 1000).toFixed(1)}k tokens</div>
                      <div style={{ marginTop: 6, height: 4, background: 'var(--color-bg-overlay)', borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-accent))', width: `${Math.min(100, (Number(s._sum.costUsd ?? 0) / (cost.totalCost || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
