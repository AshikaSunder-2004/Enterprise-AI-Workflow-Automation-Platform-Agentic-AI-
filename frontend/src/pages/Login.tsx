import React, { useState } from 'react';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Cpu, AlertTriangle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    email: '', password: '', name: '', tenantName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let res;
      if (mode === 'login') {
        res = await authApi.login(form.email, form.password);
      } else {
        res = await authApi.register({ email: form.email, password: form.password, name: form.name, tenantName: form.tenantName });
      }
      login(res.user, res.accessToken, res.refreshToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      {/* Feature highlights on the left */}
      <div className="login-features">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Cpu size={28} strokeWidth={2} />
          </div>
          <div>
            <div className="login-brand-title">AIWF Platform</div>
            <div className="login-brand-sub">Enterprise AI Workflow Automation</div>
          </div>
        </div>
        <div className="login-feature-list">
          {[
            { icon: '⚡', title: 'Visual Workflow Builder', desc: 'Drag & drop AI workflow creation with React Flow' },
            { icon: '🧠', title: 'Gemini AI Agents', desc: 'Autonomous agents powered by Google Gemini' },
            { icon: '🔄', title: 'Real-time Monitoring', desc: 'Live WebSocket execution trace & audit logs' },
            { icon: '👤', title: 'Human-in-the-Loop', desc: 'Approval gates and human decision points' },
          ].map((f) => (
            <div key={f.title} className="login-feature-item">
              <span className="login-feature-icon">{f.icon}</span>
              <div>
                <div className="login-feature-title">{f.title}</div>
                <div className="login-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="login-card card-glass">
        {/* Logo */}
        <div className="login-logo">
          <div className="sidebar-logo-icon" style={{ width: 52, height: 52, fontSize: 26, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={26} strokeWidth={2} />
          </div>
          <h1 className="gradient-text" style={{ fontSize: '1.5rem', marginTop: 14 }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Set up your organization'}
          </p>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Sign In</button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >Create Account</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Organization Name</label>
                <input className="form-control" placeholder="Acme Corp" value={form.tenantName} onChange={set('tenantName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-control" placeholder="Jane Doe" value={form.name} onChange={set('name')} required />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={8} />
          </div>

          {error && (
            <div className="toast toast-error" style={{ position: 'static', marginBottom: 16, animation: 'none' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading} id="login-submit-btn">
            {loading ? <span className="spinner" /> : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-muted" style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem' }}>
          {mode === 'login'
            ? 'Demo: register a new account to get started'
            : 'Your account will have Admin access to your organization'}
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 80px;
          position: relative;
          overflow: hidden;
          background: var(--color-bg-base);
          padding: 40px;
        }
        .login-bg { position: absolute; inset: 0; pointer-events: none; }
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
        }
        .login-orb-1 { width: 600px; height: 600px; background: var(--color-brand-primary); top: -200px; left: -100px; }
        .login-orb-2 { width: 400px; height: 400px; background: var(--color-brand-secondary); bottom: -100px; right: -50px; }
        .login-orb-3 { width: 300px; height: 300px; background: var(--color-brand-accent); top: 50%; right: 30%; }
        .login-features {
          position: relative;
          z-index: 1;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        @media (max-width: 900px) { .login-features { display: none; } }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .login-brand-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 30px rgba(99,102,241,0.4);
          flex-shrink: 0;
        }
        .login-brand-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-brand-sub { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px; }
        .login-feature-list { display: flex; flex-direction: column; gap: 20px; }
        .login-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
        }
        .login-feature-item:hover { background: rgba(255,255,255,0.05); border-color: var(--color-border-strong); }
        .login-feature-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
        .login-feature-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
        .login-feature-desc { font-size: 0.78rem; color: var(--color-text-muted); line-height: 1.4; }
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          flex-shrink: 0;
        }
        .login-logo { text-align: center; margin-bottom: 28px; }
        .login-tabs {
          display: flex;
          background: var(--color-bg-overlay);
          border-radius: var(--radius-md);
          padding: 4px;
          margin-bottom: 24px;
        }
        .login-tab {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          font-family: var(--font-sans);
        }
        .login-tab.active {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}
