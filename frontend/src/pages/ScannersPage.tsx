import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, Cpu, Globe, FileSearch, AlertTriangle,
  CheckCircle, Play, Upload, Wifi, Search, Zap
} from 'lucide-react';
import { scanPC, scanApps, scanIP, scanWebsite, scanFile } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

type ScannerTab = 'pc' | 'apps' | 'ip' | 'file' | 'website';

function ScoreGauge({ score }: { score: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--critical)' : score >= 60 ? 'var(--high)' : score >= 40 ? 'var(--medium)' : 'var(--low)';
  return (
    <div className="score-ring-container" style={{ margin: '10px 0' }}>
      <div className="gauge-wrapper" style={{ width: 140, height: 140 }}>
        <svg className="gauge-svg" viewBox="0 0 160 160">
          <circle className="gauge-bg" cx="80" cy="80" r={r} />
          <circle
            className="gauge-fill" cx="80" cy="80" r={r}
            stroke={color} strokeDasharray={circ} strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-value" style={{ color, fontSize: 28 }}>{score.toFixed(0)}</span>
          <span className="gauge-label" style={{ fontSize: 11 }}>Risk Score</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span className={`badge badge-${score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
          {score >= 80 ? 'Critical Threat' : score >= 60 ? 'High Threat' : score >= 40 ? 'Medium Threat' : 'Safe / Clean'}
        </span>
      </div>
    </div>
  );
}

export default function ScannersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ScannerTab>('pc');
  const [loading, setLoading] = useState(false);

  // Results state
  const [pcResult, setPcResult] = useState<any>(null);
  const [appsResult, setAppsResult] = useState<any>(null);
  const [ipResult, setIpResult] = useState<any>(null);
  const [fileResult, setFileResult] = useState<any>(null);
  const [websiteResult, setWebsiteResult] = useState<any>(null);

  // Inputs
  const [targetIP, setTargetIP] = useState('127.0.0.1');
  const [appName, setAppName] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  // 1. PC Scan
  const handleScanPC = async () => {
    if (!isAdmin) {
      toast.error('Admin role required for direct PC host diagnostics');
      return;
    }
    setLoading(true);
    try {
      const res = await scanPC();
      setPcResult(res.data);
      toast.success('PC scan completed');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'PC Scan failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Apps Scan
  const handleScanApps = async (specific?: string) => {
    if (!isAdmin) {
      toast.error('Admin role required for process memory & application inspection');
      return;
    }
    const target = typeof specific === 'string' ? specific : '';
    setLoading(true);
    try {
      const res = await scanApps(target || undefined);
      setAppsResult(res.data);
      toast.success('Application scan completed');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Apps Scan failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. IP Scan
  const handleScanIP = async () => {
    if (!targetIP.trim()) {
      toast.error('Please enter a valid IP address');
      return;
    }
    setLoading(true);
    try {
      const res = await scanIP(targetIP.trim());
      setIpResult(res.data);
      toast.success('IP threat analysis complete');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'IP Scan failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. File Scan
  const handleScanFile = async () => {
    if (!selectedFile) {
      toast.error('Please select or drop a file to scan');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await scanFile(formData);
      setFileResult(res.data);
      toast.success('File threat inspection complete');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'File Scan failed');
    } finally {
      setLoading(false);
    }
  };

  // 5. Website Scan
  const handleScanWebsite = async () => {
    if (!targetUrl.trim() || targetUrl.trim() === 'https://') {
      toast.error('Please enter a website URL');
      return;
    }
    setLoading(true);
    try {
      const res = await scanWebsite(targetUrl.trim());
      setWebsiteResult(res.data);
      toast.success('Website security analysis complete');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Website Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const currentResult =
    activeTab === 'pc' ? pcResult :
    activeTab === 'apps' ? appsResult :
    activeTab === 'ip' ? ipResult :
    activeTab === 'file' ? fileResult : websiteResult;

  const renderFindings = (findings: any[]) => {
    if (!findings || findings.length === 0) {
      return (
        <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 8, textAlign: 'center', color: 'var(--low)', fontSize: 13, border: '1px solid var(--border)' }}>
          <CheckCircle size={16} style={{ display: 'inline', marginRight: 6 }} /> No threat indicators detected.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {findings.map((f: any, i: number) => {
          const sevClass =
            f.severity === 'Critical' ? 'critical' :
            f.severity === 'High' ? 'high' :
            f.severity === 'Medium' ? 'medium' :
            f.severity === 'Low' ? 'low' : 'secondary';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {f.detail}
                </div>
              </div>
              <span className={`badge badge-${sevClass}`} style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }}>
                {f.severity}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Scanners Suite</h1>
          <p className="page-subtitle">Deep threat detection for PC, running applications, IP addresses, files, and websites</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-low" style={{ fontSize: 12, padding: '6px 12px' }}>
            Multi-Vector Defense
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="scanner-tabs">
        <button
          className={`scanner-tab-btn ${activeTab === 'pc' ? 'active' : ''}`}
          onClick={() => setActiveTab('pc')}
        >
          <Monitor size={16} /> PC Scanning
          {!isAdmin && <span className="tab-pill-admin">Admin</span>}
        </button>
        <button
          className={`scanner-tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <Cpu size={16} /> Apps Scanning
          {!isAdmin && <span className="tab-pill-admin">Admin</span>}
        </button>
        <button
          className={`scanner-tab-btn ${activeTab === 'ip' ? 'active' : ''}`}
          onClick={() => setActiveTab('ip')}
        >
          <Wifi size={16} /> IP Threat Scan
        </button>
        <button
          className={`scanner-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
          onClick={() => setActiveTab('file')}
        >
          <FileSearch size={16} /> File Scanning
        </button>
        <button
          className={`scanner-tab-btn ${activeTab === 'website' ? 'active' : ''}`}
          onClick={() => setActiveTab('website')}
        >
          <Globe size={16} /> Website Scanning
        </button>
        <Link
          to="/playbook"
          className="scanner-tab-btn"
          style={{ textDecoration: 'none', color: 'var(--cyan)', border: '1px dashed var(--cyan)' }}
          title="Scan any security situation or attack scenario for instant suggestions"
        >
          <Zap size={16} /> Scan Situation / Attack
        </Link>
      </div>

      {/* Scanner Workspace Layout */}
      <div className="phishing-layout" style={{ marginTop: 20 }}>
        {/* Left Column: Scanner Inputs & Specs */}
        <div>
          {/* 1. PC Scan Panel */}
          {activeTab === 'pc' && (
            <div className="chart-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={18} color="var(--cyan)" /> Host & System Health Diagnostic
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Performs static & runtime inspection of local hardware resource consumption, exposed network listening sockets, Windows Firewall profiles, and machine uptime.
              </p>

              {!isAdmin ? (
                <div style={{ padding: 14, background: 'rgba(255, 140, 0, 0.1)', border: '1px solid rgba(255, 140, 0, 0.3)', borderRadius: 8, fontSize: 13, color: 'var(--high)', marginBottom: 16 }}>
                  ⚠️ <strong>Admin Role Required:</strong> PC diagnostics require administrative privileges to inspect open sockets and system firewall rules.
                </div>
              ) : null}

              <button
                className="btn btn-primary w-full"
                onClick={handleScanPC}
                disabled={loading || !isAdmin}
                style={{ justifyContent: 'center', padding: '12px 20px' }}
              >
                {loading ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} /> Auditing System...</>
                ) : (
                  <><Play size={16} /> Start PC Security Scan</>
                )}
              </button>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>WHAT WE CHECK:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
                  <div>• High CPU Cryptominers</div>
                  <div>• Windows Firewall state</div>
                  <div>• Risky listening ports</div>
                  <div>• System reboot cycle</div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Apps Scan Panel */}
          {activeTab === 'apps' && (
            <div className="chart-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={18} color="var(--cyan)" /> Running Applications & Process Inspector
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Inspects all running processes for hacking frameworks (Mimikatz, Cobalt Strike, Netcat), disguised LOLBINs (PowerShell encoded commands), and binaries executing from temporary/untrusted directories.
              </p>

              {!isAdmin ? (
                <div style={{ padding: 14, background: 'rgba(255, 140, 0, 0.1)', border: '1px solid rgba(255, 140, 0, 0.3)', borderRadius: 8, fontSize: 13, color: 'var(--high)', marginBottom: 16 }}>
                  ⚠️ <strong>Admin Role Required:</strong> Application inspection inspects host-wide processes and command-lines.
                </div>
              ) : null}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Scan a specific application:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    id="specific-app-input"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && appName.trim()) handleScanApps(appName.trim()); }}
                    placeholder="e.g. chrome, powershell, discord"
                    disabled={!isAdmin}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => handleScanApps(appName.trim())}
                    disabled={loading || !isAdmin || !appName.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Search size={15} />}
                    Scan App
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', alignSelf: 'center' }}>Quick apps:</span>
                  {['chrome', 'msedge', 'powershell', 'cmd', 'python', 'code'].map((a) => (
                    <button key={a} className="filter-chip" onClick={() => { setAppName(a); setAppsResult(null); }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>— or —</div>

              <button
                className="btn btn-secondary w-full"
                onClick={() => handleScanApps()}
                disabled={loading || !isAdmin}
                style={{ justifyContent: 'center', padding: '12px 20px' }}
              >
                {loading ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} /> Scanning Processes...</>
                ) : (
                  <><Play size={16} /> Scan All Running Applications</>
                )}
              </button>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DETECTION RULES:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
                  <div>• Known offensive tools</div>
                  <div>• Obfuscated PowerShell</div>
                  <div>• Downloads / Temp execution</div>
                  <div>• Memory consumption</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. IP Scan Panel */}
          {activeTab === 'ip' && (
            <div className="chart-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wifi size={18} color="var(--cyan)" /> IP Threat Detection & Port Scan
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Evaluates IP scope (loopback, private, public), performs rapid port audit on localhost and private LAN targets (SMB, RDP, Telnet, MySQL, VNC), and checks whether the IP is actively connected to this host.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Target IP Address:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={targetIP}
                    onChange={(e) => setTargetIP(e.target.value)}
                    placeholder="e.g. 127.0.0.1 or 192.168.1.1"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleScanIP}
                    disabled={loading || !targetIP.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Search size={15} />}
                    Scan IP
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', alignSelf: 'center' }}>Quick targets:</span>
                {['127.0.0.1', '192.168.1.1', '10.0.0.1', '8.8.8.8'].map((ip) => (
                  <button
                    key={ip}
                    className="filter-chip"
                    onClick={() => { setTargetIP(ip); setIpResult(null); }}
                  >
                    {ip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. File Scan Panel */}
          {activeTab === 'file' && (
            <div className="chart-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSearch size={18} color="var(--cyan)" /> File Threat & Malware Inspector
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Performs static file analysis: cryptographic hashes (SHA-256 / MD5), Shannon entropy (detects packed / encrypted payloads), header magic byte mismatch, double extensions, and embedded script payloads.
              </p>

              {/* Upload Dropzone */}
              <div
                className="file-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
                <Upload size={32} color="var(--cyan)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedFile ? selectedFile.name : 'Click or drag file here to analyze'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports binaries, documents, scripts, archives (Max 25MB)'}
                </div>
              </div>

              <button
                className="btn btn-primary w-full"
                onClick={handleScanFile}
                disabled={loading || !selectedFile}
                style={{ marginTop: 16, justifyContent: 'center' }}
              >
                {loading ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} /> Analyzing Byte Stream...</>
                ) : (
                  <><Play size={16} /> Scan File For Malware</>
                )}
              </button>
            </div>
          )}

          {/* 5. Website Scan Panel */}
          {activeTab === 'website' && (
            <div className="chart-card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={18} color="var(--cyan)" /> Website Security & Phishing Scanner
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Audits external websites for HTTPS enforcement, TLS certificate expiration, crucial security headers (HSTS, CSP, X-Frame-Options), phishing domain tactics, unencrypted credential forms, and in-browser crypto miners.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Target Website URL:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleScanWebsite}
                    disabled={loading || !targetUrl.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Search size={15} />}
                    Scan URL
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', alignSelf: 'center' }}>Test domains:</span>
                {['https://github.com', 'https://google.com', 'http://neverssl.com'].map((u) => (
                  <button
                    key={u}
                    className="filter-chip"
                    onClick={() => { setTargetUrl(u); setWebsiteResult(null); }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Scan Results Output */}
        <div>
          {!currentResult && !loading && (
            <div className="chart-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Scanner Engine Ready</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
                Initiate a scan on the left panel to execute real-time threat intelligence and vulnerability analysis.
              </div>
            </div>
          )}

          {loading && (
            <div className="chart-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px', borderWidth: 3 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                CyberGuard AI Executing Scan...
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Evaluating signatures, telemetry, and vulnerability rules
              </div>
            </div>
          )}

          {currentResult && !loading && (
            <div className="result-card animate-fade">
              {/* Verdict banner */}
              <div
                className="result-verdict"
                style={{
                  background:
                    currentResult.risk_score >= 60 ? 'var(--critical-dim)' :
                    currentResult.risk_score >= 40 ? 'rgba(245, 196, 0, 0.1)' : 'var(--low-dim)',
                  border: `1px solid ${
                    currentResult.risk_score >= 60 ? 'rgba(255, 59, 78, 0.3)' :
                    currentResult.risk_score >= 40 ? 'rgba(245, 196, 0, 0.3)' : 'rgba(0, 196, 140, 0.3)'
                  }`,
                }}
              >
                <div className="verdict-icon">
                  {currentResult.risk_score >= 60 ? '🚨' : currentResult.risk_score >= 40 ? '⚠️' : '✅'}
                </div>
                <div
                  className="verdict-label"
                  style={{
                    color:
                      currentResult.risk_score >= 60 ? 'var(--critical)' :
                      currentResult.risk_score >= 40 ? 'var(--high)' : 'var(--low)',
                  }}
                >
                  {currentResult.threat_type.toUpperCase()}
                </div>
                <div className="verdict-sub">{currentResult.summary}</div>
              </div>

              {/* Gauge */}
              <ScoreGauge score={currentResult.risk_score} />

              <div className="divider" />

              {/* Findings List */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} color="var(--cyan)" />
                  Inspection Findings ({currentResult.findings?.length ?? 0})
                </div>
                {renderFindings(currentResult.findings)}
              </div>

              {/* Specific Details Accordion / Cards based on active scanner */}
              {activeTab === 'pc' && currentResult.details && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    HOST DIAGNOSTIC TELEMETRY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                    <div style={{ padding: 8, background: 'var(--bg-card)', borderRadius: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{currentResult.details.cpu_percent}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>CPU Usage</div>
                    </div>
                    <div style={{ padding: 8, background: 'var(--bg-card)', borderRadius: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--medium)' }}>{currentResult.details.memory_percent}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>RAM Usage</div>
                    </div>
                    <div style={{ padding: 8, background: 'var(--bg-card)', borderRadius: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{currentResult.details.uptime_days} d</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Uptime</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'apps' && currentResult.details?.flagged && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    FLAGGED PROCESSES ({currentResult.details.flagged.length})
                  </div>
                  {currentResult.details.flagged.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--low)' }}>No suspicious running processes found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {currentResult.details.flagged.map((p: any, idx: number) => (
                        <div key={idx} style={{ padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>{p.name} (PID: {p.pid})</span>
                          <span style={{ color: 'var(--critical)' }}>{p.flags?.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ip' && currentResult.details?.open_ports && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    OPEN SERVICES ({currentResult.details.open_ports.length})
                  </div>
                  {currentResult.details.open_ports.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--low)' }}>No common sensitive ports open.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {currentResult.details.open_ports.map((op: any, i: number) => (
                        <div key={i} style={{ padding: '4px 10px', background: 'rgba(255, 59, 78, 0.1)', border: '1px solid rgba(255, 59, 78, 0.3)', borderRadius: 6, fontSize: 12, color: 'var(--critical)', fontWeight: 600 }}>
                          Port {op.port} ({op.service})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'file' && currentResult.details && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'monospace' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>SHA-256: <span style={{ color: 'var(--cyan)' }}>{currentResult.details.sha256}</span></div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>TYPE: <span style={{ color: 'var(--text-primary)' }}>{currentResult.details.detected_type}</span></div>
                  <div style={{ color: 'var(--text-secondary)' }}>ENTROPY: <span style={{ color: currentResult.details.entropy > 7 ? 'var(--critical)' : 'var(--low)' }}>{currentResult.details.entropy} / 8.0</span></div>
                </div>
              )}

              {/* Recommendation */}
              <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--low)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🛡️ Recommended Security Action
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{currentResult.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
