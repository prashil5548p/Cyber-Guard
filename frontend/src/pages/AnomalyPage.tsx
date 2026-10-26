import { useState } from 'react';
import { checkNetworkEvent } from '../api';
import { Wifi, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function ScoreGauge({ score }: { score: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--low)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div className="gauge-wrapper" style={{ width: 140, height: 140 }}>
        <svg className="gauge-svg" viewBox="0 0 140 140">
          <circle className="gauge-bg" cx="70" cy="70" r={r} />
          <circle className="gauge-fill" cx="70" cy="70" r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="gauge-center">
          <span className="gauge-value" style={{ color, fontSize: 24 }}>{score.toFixed(0)}</span>
          <span className="gauge-label">Risk</span>
        </div>
      </div>
    </div>
  );
}

function ResultBox({ result }: { result: any }) {
  const isAnomaly = result.risk_score > 40;
  const color = result.severity === 'Critical' ? 'var(--critical)' : result.severity === 'High' ? 'var(--high)' : result.severity === 'Medium' ? 'var(--medium)' : 'var(--low)';

  return (
    <div className="result-card animate-fade" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-primary)', borderRadius: 10, border: `1px solid ${color}40` }}>
        <div style={{ fontSize: 36 }}>{isAnomaly ? '🚨' : '✅'}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color }}>{result.threat_type}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Severity: <span style={{ color }} className="badge">{result.severity}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ScoreGauge score={result.risk_score} />
        </div>
      </div>

      {result.details?.flags?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--high)' }}>
            ⚠️ Anomaly Flags
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.details.flags.map((flag: string, i: number) => (
              <div key={i} style={{
                padding: '8px 14px', background: 'var(--high-dim)', borderRadius: 8,
                border: '1px solid rgba(255,140,0,0.2)', fontSize: 13, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertTriangle size={14} color="var(--high)" /> {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', marginBottom: 6, textTransform: 'uppercase' }}>🔍 AI Explanation</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.explanation}</p>
      </div>

      <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--low)', marginBottom: 6, textTransform: 'uppercase' }}>🛡️ Recommendation</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.recommendation}</p>
      </div>
    </div>
  );
}

export default function AnomalyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [network, setNetwork] = useState({
    source_ip: '10.0.0.50', destination_ip: '192.168.1.1',
    port: 80, protocol: 'TCP', connections_per_minute: 10,
  });

  const handleNetworkCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await checkNetworkEvent(network);
      setResult(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Check failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const SliderField = ({ label, field, min, max, state, setState }: any) => (
    <div className="slider-group">
      <div className="slider-row">
        <label className="form-label">{label}</label>
        <span className="slider-val">{state[field]}</span>
      </div>
      <input
        type="range" className="slider-input"
        min={min} max={max} value={state[field]}
        onChange={e => setState((s: any) => ({ ...s, [field]: Number(e.target.value) }))}
      />
    </div>
  );

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Anomaly Detection</h1>
          <p className="page-subtitle">Isolation Forest + Rule-based analysis</p>
        </div>
        <div style={{
          background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)',
          borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--low)', fontWeight: 600,
        }}>
          🌲 Isolation Forest Active
        </div>
      </div>

      <div className="anomaly-grid">
        {/* Form Panel */}
        <div className="chart-card">
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wifi size={18} color="var(--cyan)" /> Network Traffic Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Source IP</label>
                  <input className="form-input" value={network.source_ip} onChange={e => setNetwork(s => ({ ...s, source_ip: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination IP</label>
                  <input className="form-input" value={network.destination_ip} onChange={e => setNetwork(s => ({ ...s, destination_ip: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Port Number</label>
                  <input className="form-input" type="number" value={network.port} onChange={e => setNetwork(s => ({ ...s, port: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Protocol</label>
                  <select className="form-select" value={network.protocol} onChange={e => setNetwork(s => ({ ...s, protocol: e.target.value }))}>
                    {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <SliderField label="Connections per Minute" field="connections_per_minute" min={1} max={100} state={network} setState={setNetwork} />

                <div>
                  <div className="form-label" style={{ marginBottom: 8 }}>Quick Scenarios</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="filter-chip" onClick={() => setNetwork({ source_ip: '192.168.1.5', destination_ip: '8.8.8.8', port: 443, protocol: 'HTTPS', connections_per_minute: 8 })}>
                      ✅ Normal HTTPS
                    </button>
                    <button className="filter-chip" onClick={() => setNetwork({ source_ip: '10.0.0.77', destination_ip: '192.168.1.1', port: 4444, protocol: 'TCP', connections_per_minute: 45 })}>
                      🚨 Backdoor Port
                    </button>
                    <button className="filter-chip" onClick={() => setNetwork({ source_ip: '172.16.5.200', destination_ip: '10.0.0.1', port: 1337, protocol: 'TCP', connections_per_minute: 60 })}>
                      🔴 C2 Traffic
                    </button>
                  </div>
                </div>

                <button className="btn btn-primary w-full" onClick={handleNetworkCheck} disabled={loading} style={{ justifyContent: 'center', marginTop: 8 }}>
                  {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Analyzing...</> : <><Wifi size={16} /> Analyze Network Traffic</>}
                </button>
              </div>
            </>
        </div>

        {/* Results Panel */}
        <div>
          <div className="chart-card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🌲 About Isolation Forest</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { title: 'Unsupervised ML', desc: 'Trained on normal behavior patterns without labeled anomalies' },
                { title: 'Isolation Scoring', desc: 'Anomalies are isolated faster (fewer tree splits needed)' },
                { title: 'Rule Augmentation', desc: 'ML scores are enhanced with configurable security rules' },
                { title: 'Real-time Scoring', desc: 'Events are scored instantly against learned baselines' },
              ].map(({ title, desc }) => (
                <div key={title} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {result && <ResultBox result={result} />}
        </div>
      </div>
    </div>
  );
}
