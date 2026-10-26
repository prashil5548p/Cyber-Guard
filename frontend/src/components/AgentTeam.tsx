import { Bug, Activity, Brain, Bot, Layers, Workflow } from 'lucide-react';

const AGENTS = [
  { icon: <Bug size={16} />, name: 'Phishing Detector Agent', tech: 'TF-IDF + Logistic Regression', role: 'Classifies messages & URLs as phishing or legitimate', color: '#ff3b4e' },
  { icon: <Activity size={16} />, name: 'Anomaly Detector Agent', tech: 'Isolation Forest + Rules', role: 'Flags unusual login and network traffic patterns', color: '#ff9f1c' },
  { icon: <Layers size={16} />, name: 'Scanner Agents (x5)', tech: 'PC · Apps · IP · File · Website', role: 'Inspect hosts, processes, files, IPs and websites', color: '#00d4ff' },
  { icon: <Brain size={16} />, name: 'Decision Agent', tech: 'Rule-based + ML ensemble', role: 'Combines all findings, scores risk, recommends actions', color: '#7c3aed' },
  { icon: <Bot size={16} />, name: 'Security Copilot Agent', tech: 'Conversational assistant', role: 'Explains alerts and guides analysts using live data', color: '#22c55e' },
];

export default function AgentTeam() {
  return (
    <div className="card" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 20, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontWeight: 600 }}>
        <Workflow size={16} color="var(--cyan)" /> AI Agents Working Together
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Detection agents feed findings to the Decision Agent, which scores risk and raises alerts. The Copilot explains the results.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {AGENTS.map(a => (
          <div key={a.name} style={{
            border: `1px solid ${a.color}40`, background: `${a.color}0d`,
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: a.color, fontWeight: 600, fontSize: 13 }}>
              {a.icon}{a.name}
              <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} title="Active" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0' }}>{a.tech}</div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>{a.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
