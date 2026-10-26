import React, { useEffect, useState, useCallback } from 'react';
import { getEvents } from '../api';
import { format } from 'date-fns';
import { Search, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface Event {
  event_id: number; timestamp: string; event_type: string;
  source: string; event_data: string | null;
}

const EVENT_ICONS: Record<string, string> = {
  phishing_check: '🎣',
  login_anomaly: '🔑',
  network_event: '🌐',
  simulation: '🤖',
};

const EVENT_COLORS: Record<string, string> = {
  phishing_check: 'var(--critical)',
  login_anomaly: 'var(--high)',
  network_event: 'var(--cyan)',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvents({ limit: 100 });
      setEvents(res.data);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e =>
    !search ||
    e.event_type.includes(search.toLowerCase()) ||
    e.source.includes(search) ||
    (e.event_data ?? '').includes(search)
  );

  const parseData = (raw: string | null) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Events</h1>
          <p className="page-subtitle">{filtered.length} events recorded</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <Search className="input-icon" size={14} />
          <input
            className="form-input"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Database size={48} opacity={0.3} /></div>
            <p className="empty-state-text">No events yet. Run the phishing detector or generate a simulation from the Dashboard.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Timestamp</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => {
                  const data = parseData(ev.event_data);
                  const isOpen = expanded === ev.event_id;
                  return (
                    <React.Fragment key={ev.event_id}>
                      <tr onClick={() => setExpanded(isOpen ? null : ev.event_id)} style={{ cursor: 'pointer' }}>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>#{ev.event_id}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{EVENT_ICONS[ev.event_type] ?? '📌'}</span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: EVENT_COLORS[ev.event_type] ?? 'var(--text-primary)' }}>
                              {ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </div>
                        </td>
                        <td><span className="ip-tag">{ev.source}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {format(new Date(ev.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.event_data ? ev.event_data.slice(0, 60) + (ev.event_data.length > 60 ? '…' : '') : '—'}
                        </td>
                      </tr>
                      {isOpen && data && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 16px 16px' }}>
                            <div style={{
                              background: 'var(--bg-primary)', borderRadius: 8, padding: 14,
                              border: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 12, color: 'var(--cyan)', lineHeight: 1.8,
                            }}>
                              {Object.entries(data).map(([k, v]) => (
                                <div key={k}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>{' '}
                                  <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
