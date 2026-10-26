import { useState, useEffect } from 'react';
import {
  Shield, Users, UserCheck, ShieldAlert, FileText, Trash2,
  RefreshCw, Activity, Clock
} from 'lucide-react';
import { getAdminUsers, updateUserRole, deleteUser, getAdminAuditLogs, getAdminOverview } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [uRes, aRes, oRes] = await Promise.all([
        getAdminUsers(),
        getAdminAuditLogs(100),
        getAdminOverview(),
      ]);
      setUsers(uRes.data);
      setAuditLogs(aRes.data);
      setOverview(oRes.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleRoleChange = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'analyst' : 'admin';
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`Are you sure you want to remove user ${email}?`)) return;
    try {
      await deleteUser(userId);
      toast.success('User removed');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to delete user');
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="chart-card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 540, margin: '60px auto' }}>
          <ShieldAlert size={56} color="var(--critical)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Access Restricted</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            You are signed in as an <strong>Analyst</strong>. Administrative access is restricted to authorized Security Administrators.
          </p>
          <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            To grant your account admin permissions, update the <code>ADMIN_EMAILS</code> configuration or contact the system administrator.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Control Center</h1>
          <p className="page-subtitle">User management, RBAC enforcement, and compliance audit trail</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Users</span>
            <Users size={18} color="var(--cyan)" />
          </div>
          <div className="stat-value">{overview?.users ?? 0}</div>
          <div className="stat-sub">{overview?.admins ?? 0} administrators active</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">System Detections</span>
            <Activity size={18} color="var(--medium)" />
          </div>
          <div className="stat-value">{overview?.alerts ?? 0}</div>
          <div className="stat-sub">{overview?.events ?? 0} total security events</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Scans Performed</span>
            <Shield size={18} color="var(--low)" />
          </div>
          <div className="stat-value">{overview?.scans ?? 0}</div>
          <div className="stat-sub">PC, App, IP, File & Web scans</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Audit Trail Records</span>
            <FileText size={18} color="var(--text-secondary)" />
          </div>
          <div className="stat-value">{overview?.audit_entries ?? 0}</div>
          <div className="stat-sub">Tamper-evident log entries</div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={18} color="var(--cyan)" /> User Access & Role Permissions (RBAC)
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email Address</th>
                <th>Current Role</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-critical' : 'badge-low'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => handleRoleChange(u.user_id, u.role)}
                        disabled={updatingId === u.user_id || u.user_id === user?.user_id}
                        title={u.role === 'admin' ? 'Demote to Analyst' : 'Promote to Admin'}
                      >
                        {u.role === 'admin' ? 'Demote to Analyst' : 'Promote to Admin'}
                      </button>
                      {u.user_id !== user?.user_id && (
                        <button
                          className="icon-btn"
                          style={{ color: 'var(--critical)' }}
                          onClick={() => handleDeleteUser(u.user_id, u.email)}
                          title="Remove user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Trail Logs */}
      <div className="chart-card">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="var(--cyan)" /> Live Security Audit Logs
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Identity</th>
                <th>Security Action</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.audit_id}>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{log.user}</td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontSize: 11 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
