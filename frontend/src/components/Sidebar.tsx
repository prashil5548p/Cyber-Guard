import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, Bug, Activity,
  Database, LogOut, Layers, Bot, UserCheck, BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MAIN_NAV = [
  { path: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { path: '/alerts', icon: <AlertTriangle size={16} />, label: 'Threat Alerts' },
  { path: '/scanners', icon: <Layers size={16} />, label: 'Security Scanners' },
  { path: '/phishing', icon: <Bug size={16} />, label: 'Phishing Detector' },
  { path: '/anomaly', icon: <Activity size={16} />, label: 'Anomaly Detection' },
  { path: '/playbook', icon: <BookOpen size={16} />, label: 'Security Playbook' },
  { path: '/chat', icon: <Bot size={16} />, label: 'AI Security Copilot' },
  { path: '/events', icon: <Database size={16} />, label: 'Event Logs' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Shield size={20} color="#000" />
        </div>
        <div className="logo-text">
          Cyber<span>Guard</span> <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12 }}>AI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {MAIN_NAV.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {icon}
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Administration</div>
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <UserCheck size={16} />
          <span>Admin Center</span>
          {isAdmin && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 9,
                fontWeight: 700,
                background: 'var(--critical-dim)',
                color: 'var(--critical)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(255, 59, 78, 0.3)',
              }}
            >
              ADMIN
            </span>
          )}
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: 16 }}>AI Agents Working Together</div>
        <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
          {['Phishing Detector', 'Anomaly Detector', '5 Scanners', 'Decision Agent', 'Security Copilot'].map(a => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              {a}
            </div>
          ))}
        </div>
      </nav>

      {/* User Card */}
      <div className="sidebar-footer">
        <div className="user-card" onClick={handleLogout} title="Click to logout">
          <div className="avatar">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name ?? 'User'}</div>
            <div className="user-role" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{user?.role ?? 'analyst'}</span>
              {isAdmin && (
                <span style={{ color: 'var(--critical)', fontSize: 10, fontWeight: 700 }}>• ROOT</span>
              )}
            </div>
          </div>
          <LogOut size={14} color="var(--text-secondary)" />
        </div>
        <button
          className="btn btn-secondary w-full"
          onClick={handleLogout}
          style={{ justifyContent: 'center', marginTop: 10, gap: 8 }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}
