import { useState, useEffect, useCallback } from 'react';
import { getAlerts, updateAlert } from '../api';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Alert {
  alert_id: number; event_id: number; threat_type: string;
  risk_score: number; severity: string; status: string;
  explanation: string; recommendation: string; created_at: string;
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--low)';
  return (
    <div className="risk-bar-container">
      <div className="risk-bar">
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="risk-value" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: 'badge-critical', High: 'badge-high',
    Medium: 'badge-medium', Low: 'badge-low'
  };
  return <span className={`badge ${map[severity] ?? 'badge-low'}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open: 'badge-open', Investigating: 'badge-investigating', Resolved: 'badge-resolved'
  };
  return <span className={`badge ${map[status] ?? 'badge-open'}`}>{status}</span>;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Alert | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await getAlerts(params);
      setAlerts(res.data);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = alerts.filter(a =>
    !search || a.threat_type.toLowerCase().includes(search.toLowerCase()) ||
    a.explanation?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateStatus = async () => {
    if (!selected || !newStatus) return;
    setUpdating(true);
    try {
      await updateAlert(selected.alert_id, { status: newStatus, analyst_notes: notes });
      toast.success(`Alert updated to "${newStatus}"`);
      setSelected(null);
      load();
    } catch {
      toast.error('Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const severities = ['', 'Critical', 'High', 'Medium', 'Low'];
  const statuses = ['', 'Open', 'Investigating', 'Resolved'];

  const rowClass = (s: string) => `row-${s.toLowerCase()}`;

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Alerts</h1>
          <p className="page-subtitle">{filtered.length} alert{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="input-group" style={{ flex: '0 0 260px' }}>
          <Search className="input-icon" size={14} />
          <input
            className="form-input" placeholder="Search alerts..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 36, fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Filter size={14} color="var(--text-secondary)" />
          {severities.map(s => (
            <button
              key={s || 'all'} onClick={() => setSeverityFilter(s)}
              className={`filter-chip ${severityFilter === s ? 'active' : ''}`}
            >
              {s || 'All Severity'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {statuses.map(s => (
            <button
              key={s || 'all'} onClick={() => setStatusFilter(s)}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            >
              {s || 'All Status'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <p className="empty-state-text">No alerts found. Try adjusting filters or run a simulation from the Dashboard.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Threat Type</th>
                  <th>Severity</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(alert => (
                  <tr key={alert.alert_id} className={rowClass(alert.severity)}>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>#{alert.alert_id}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.threat_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.explanation}
                      </div>
                    </td>
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td style={{ minWidth: 140 }}><RiskBar score={alert.risk_score} /></td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelected(alert); setNewStatus(alert.status); setNotes(''); }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Alert #{selected.alert_id}</span>
              <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <SeverityBadge severity={selected.severity} />
              <StatusBadge status={selected.status} />
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Risk: {selected.risk_score.toFixed(1)}
              </span>
            </div>

            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔍 AI Explanation</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.explanation}</p>
            </div>

            <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--low)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🛡️ Recommendation</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.recommendation}</p>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Update Status</label>
              <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Analyst Notes (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Add investigation notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateStatus} disabled={updating}>
                {updating ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <CheckCircle size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
