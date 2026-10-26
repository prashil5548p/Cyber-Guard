import { useState } from 'react';
import { checkPhishing } from '../api';
import { Send, AlertTriangle, Link } from 'lucide-react';
import toast from 'react-hot-toast';

const EXAMPLE_MSGS = [
  { label: '🎣 Phishing', text: 'URGENT: Your account has been suspended! Click here immediately to verify: http://paypal-secure.xyz/verify or your account will be permanently deleted!' },
  { label: '✉️ Legitimate', text: 'Hi team, please find attached the Q3 marketing report as discussed in yesterday\'s meeting. Let me know if you have any questions.' },
  { label: '🔴 Critical', text: 'Congratulations! You\'ve won a $10,000 prize! Claim it now at http://prize-claim.ru/win before it expires in 24 hours! Limited offer!' },
  { label: '💼 Legit', text: 'Reminder: Your scheduled dentist appointment is tomorrow at 2:30 PM. Please call us at (555) 234-5678 if you need to reschedule.' },
];

function ScoreGauge({ score }: { score: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--low)';
  return (
    <div className="score-ring-container">
      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 160 160">
          <circle className="gauge-bg" cx="80" cy="80" r={r} />
          <circle
            className="gauge-fill" cx="80" cy="80" r={r}
            stroke={color} strokeDasharray={circ} strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-value" style={{ color }}>{score.toFixed(0)}</span>
          <span className="gauge-label">Risk Score</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span className={`badge badge-${score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low'}`} style={{ fontSize: 13, padding: '5px 16px' }}>
          {score >= 80 ? 'Critical Risk' : score >= 60 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk'}
        </span>
      </div>
    </div>
  );
}

export default function PhishingPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!message.trim()) { toast.error('Please enter a message to analyze'); return; }
    setLoading(true);
    try {
      const res = await checkPhishing(message);
      setResult(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Analysis failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const isPhishing = result?.details?.prediction === 'Phishing';

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Phishing Detector</h1>
          <p className="page-subtitle">AI-powered analysis using TF-IDF + Logistic Regression</p>
        </div>
        <div style={{
          background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--cyan)', fontWeight: 600,
        }}>
          🤖 ML Model Active
        </div>
      </div>

      {/* Example messages */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>Quick examples:</span>
        {EXAMPLE_MSGS.map(ex => (
          <button
            key={ex.label}
            className="filter-chip"
            onClick={() => { setMessage(ex.text); setResult(null); }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="phishing-layout">
        {/* Input Panel */}
        <div>
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} color="var(--cyan)" />
              Message / Email Content
            </div>
            <textarea
              className="form-textarea"
              placeholder="Paste an email, SMS, or any message to analyze for phishing indicators..."
              value={message}
              onChange={e => { setMessage(e.target.value); setResult(null); }}
              style={{ minHeight: 160, marginBottom: 12 }}
            />
            <button
              className="btn btn-primary w-full"
              onClick={handleCheck}
              disabled={loading || !message.trim()}
              style={{ justifyContent: 'center' }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> Analyzing...</>
              ) : (
                <><Send size={16} /> Analyze Message</>
              )}
            </button>
          </div>

          {/* How it works */}
          <div className="chart-card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔬 How It Works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🔤', title: 'TF-IDF Vectorization', desc: 'Converts message text into numerical features based on word importance' },
                { icon: '🧠', title: 'Logistic Regression', desc: 'Classifies the message as phishing or legitimate with confidence score' },
                { icon: '🔗', title: 'URL Analysis', desc: 'Checks links for suspicious domains and redirect patterns' },
                { icon: '⚠️', title: 'Keyword Detection', desc: 'Identifies urgency language, financial lures, and impersonation attempts' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 10, padding: '10px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {!result && !loading && (
            <div className="chart-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Ready to Analyze</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Enter a message or select an example to get started
              </div>
            </div>
          )}

          {loading && (
            <div className="chart-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>AI model analyzing message...</div>
            </div>
          )}

          {result && !loading && (
            <div className="result-card animate-fade">
              {/* Verdict */}
              <div className={`result-verdict ${isPhishing ? 'verdict-phishing' : 'verdict-legit'}`}>
                <div className="verdict-icon">{isPhishing ? '🎣' : '✅'}</div>
                <div className="verdict-label" style={{ color: isPhishing ? 'var(--critical)' : 'var(--low)' }}>
                  {isPhishing ? 'PHISHING DETECTED' : 'LEGITIMATE MESSAGE'}
                </div>
                <div className="verdict-sub">
                  Confidence: {(result.details?.confidence * 100).toFixed(1)}%
                </div>
              </div>

              {/* Score Gauge */}
              <ScoreGauge score={result.risk_score} />

              <div className="divider" />

              {/* Reasons */}
              {result.details?.reasons?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color={isPhishing ? 'var(--critical)' : 'var(--low)'} />
                    Key Indicators
                  </div>
                  <div className="reasons-list">
                    {result.details.reasons.map((r: string, i: number) => (
                      <div key={i} className="reason-item">
                        <div className="reason-dot" style={{ background: isPhishing ? 'var(--critical)' : 'var(--low)' }} />
                        <span style={{ fontSize: 12 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URLs */}
              {result.details?.urls_found?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link size={14} color="var(--cyan)" /> URLs Found ({result.details.urls_found.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.details.urls_found.map((url: string, i: number) => (
                      <div key={i} style={{
                        padding: '6px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                        background: result.details.suspicious_urls.includes(url) ? 'var(--critical-dim)' : 'var(--low-dim)',
                        border: `1px solid ${result.details.suspicious_urls.includes(url) ? 'rgba(255,59,78,0.2)' : 'rgba(0,196,140,0.2)'}`,
                        color: result.details.suspicious_urls.includes(url) ? 'var(--critical)' : 'var(--low)',
                        wordBreak: 'break-all',
                      }}>
                        {result.details.suspicious_urls.includes(url) ? '⚠️ ' : '✓ '}{url}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--medium)' }}>{result.details?.keyword_count ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Phishing Keywords</div>
                </div>
                <div style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--critical)' }}>{result.details?.suspicious_urls?.length ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Suspicious URLs</div>
                </div>
                <div style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)' }}>{result.details?.urls_found?.length ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total URLs</div>
                </div>
              </div>

              {/* Recommendation */}
              <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--low)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🛡️ Recommended Action
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
