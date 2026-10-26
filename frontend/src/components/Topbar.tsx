import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Security Dashboard', subtitle: 'Real-time threat monitoring' },
  '/alerts': { title: 'Threat Alerts', subtitle: 'AI-generated security alerts' },
  '/scanners': { title: 'Security Scanners Suite', subtitle: 'PC, Apps, IP, File & Website threat detection' },
  '/phishing': { title: 'Phishing Detector', subtitle: 'TF-IDF + Logistic Regression' },
  '/anomaly': { title: 'Anomaly Detection', subtitle: 'Isolation Forest analysis' },
  '/chat': { title: 'AI Security Copilot', subtitle: 'Threat intelligence assistant' },
  '/events': { title: 'Event Logs', subtitle: 'Security event history' },
  '/admin': { title: 'Admin Control Center', subtitle: 'Role-based access control & security audit logs' },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };
  const info = PAGE_TITLES[pathname] ?? { title: 'CyberGuard AI', subtitle: '' };

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title" style={{ fontSize: 16 }}>{info.title}</div>
        {info.subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{info.subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <div className="live-indicator">
          <div className="live-dot" />
          System Online
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>🤖 AI</span> Models Active
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout} id="topbar-logout">
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}
