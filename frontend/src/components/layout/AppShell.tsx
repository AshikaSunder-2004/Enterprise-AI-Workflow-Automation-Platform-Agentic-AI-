import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Zap, Play, UserCheck, BarChart3, LogOut, Cpu
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { to: '/workflows', icon: <Zap size={16} />, label: 'Workflows' },
    { to: '/runs', icon: <Play size={16} />, label: 'Runs' },
    { to: '/human-tasks', icon: <UserCheck size={16} />, label: 'Human Tasks' },
    { to: '/cost', icon: <BarChart3 size={16} />, label: 'Cost & Analytics' },
  ];

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Cpu size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="sidebar-logo-text">AIWF</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>AI Workflow Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Main</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge !== undefined && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, color: 'white' }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: 500, fontSize: '0.8rem' }}>{user?.name}</div>
              <div className="truncate text-muted" style={{ fontSize: '0.7rem' }}>{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={handleLogout} id="logout-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
