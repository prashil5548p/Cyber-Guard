import { useEffect, useState, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
  Shield, AlertTriangle, Activity, Bug, Play, RefreshCw, Zap
} from 'lucide-react';
import { getDashboardStats, getChartData, simulateEvents } from '../api';
import toast from 'react-hot-toast';
import AgentTeam from '../components/AgentTeam';

interface Stats {
  total_events: number; total_alerts: number;
  critical_alerts: number; high_alerts: number; medium_alerts: number; low_alerts: number;
  open_alerts: number; resolved_alerts: number; phishing_detected: number; anomalies_detected: number;
}

function StatCard({ label, value, icon, color, sub, accent }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; sub?: string; accent?: string;
}) {
  return (
    <div className="stat-card" style={{ '--card-accent': accent || color } as any}>
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--low)';

  return (
    <div className="gauge-wrapper">
      <svg className="gauge-svg" viewBox="0 0 160 160">
        <circle className="gauge-bg" cx="80" cy="80" r={r} />
        <circle
          className="gauge-fill" cx="80" cy="80" r={r}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-value" style={{ color }}>{score}</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 14px', boxShadow: 'var(--shadow-card)'
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([getDashboardStats(), getChartData()]);
      setStats(s.data);
      setChartData(c.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await simulateEvents(10);
      toast.success(`Generated ${res.data.events.length} simulated events!`);
      load();
    } catch {
      toast.error('Simulation failed — is the backend running?');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
          <div className="skeleton" style={{ height: 300 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  const overallRisk = stats ? Math.round(
    (stats.critical_alerts * 4 + stats.high_alerts * 3 + stats.medium_alerts * 2 + stats.low_alerts) /
    Math.max(stats.total_alerts, 1) * 20
  ) : 0;

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Dashboard</h1>
          <p className="page-subtitle">Real-time threat monitoring and AI-powered analysis</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSimulate} disabled={simulating}>
            {simulating ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Play size={14} />}
            {simulating ? 'Generating...' : 'Simulate Events'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard label="Total Events" value={stats?.total_events ?? 0} icon={<Activity size={18} />} color="var(--cyan)" accent="var(--cyan)" sub="All monitored security events" />
        <StatCard label="Active Alerts" value={stats?.open_alerts ?? 0} icon={<AlertTriangle size={18} />} color="var(--high)" accent="var(--high)" sub={`${stats?.total_alerts ?? 0} total alerts`} />
        <StatCard label="Phishing Detected" value={stats?.phishing_detected ?? 0} icon={<Bug size={18} />} color="var(--critical)" accent="var(--critical)" sub="AI-classified messages" />
        <StatCard label="Critical Threats" value={stats?.critical_alerts ?? 0} icon={<Shield size={18} />} color="#ff3b4e" accent="#ff3b4e" sub={`${stats?.high_alerts ?? 0} High severity alerts`} />
      </div>

      <AgentTeam />

      {/* Secondary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Critical', count: stats?.critical_alerts ?? 0, color: 'var(--critical)', cls: 'badge-critical' },
          { label: 'High', count: stats?.high_alerts ?? 0, color: 'var(--high)', cls: 'badge-high' },
          { label: 'Medium', count: stats?.medium_alerts ?? 0, color: 'var(--medium)', cls: 'badge-medium' },
          { label: 'Low', count: stats?.low_alerts ?? 0, color: 'var(--low)', cls: 'badge-low' },
        ].map(({ label, count, color, cls }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span className={`badge ${cls}`}>{label}</span>
            <span style={{ fontSize: 24, fontWeight: 800, color }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Area Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-title">Alerts by Severity</div>
              <div className="chart-subtitle">Daily alert counts over the last 14 days</div>
            </div>
            <Zap size={16} color="var(--cyan)" />
          </div>
          {chartData?.daily_alerts?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData.daily_alerts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Critical" stackId="a" fill="#ff3b4e" />
                <Bar dataKey="High" stackId="a" fill="#ff8c00" />
                <Bar dataKey="Medium" stackId="a" fill="#f5c400" />
                <Bar dataKey="Low" stackId="a" fill="#00c48c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p className="empty-state-text">No alert data yet. Click "Simulate Events" to generate data.</p>
            </div>
          )}
        </div>

        {/* Pie Chart + Gauge */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-title">Severity Distribution</div>
              <div className="chart-subtitle">Alert breakdown by risk level</div>
            </div>
          </div>
          {chartData?.severity_distribution?.some((d: any) => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={chartData.severity_distribution}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                  >
                    {chartData.severity_distribution.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
                  <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <RiskGauge score={Math.min(100, overallRisk)} label="Risk Score" />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <p className="empty-state-text">Run a simulation to see threat distribution.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[
          { label: 'Resolved Alerts', value: stats?.resolved_alerts ?? 0, icon: '✅', color: 'var(--low)' },
          { label: 'Anomalies Detected', value: stats?.anomalies_detected ?? 0, icon: '⚠️', color: 'var(--high)' },
          { label: 'Investigating', value: (stats?.total_alerts ?? 0) - (stats?.open_alerts ?? 0) - (stats?.resolved_alerts ?? 0), icon: '🔍', color: 'var(--medium)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 32 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{Math.max(0, value)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
