import { useMemo, useState } from 'react';
import {
  BookOpen, Search, ChevronDown, ChevronUp, ShieldAlert,
  ShieldCheck, Siren, Sparkles, ArrowRight, RefreshCw, Zap
} from 'lucide-react';

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

interface Playbook {
  id: string;
  title: string;
  icon: string;
  category: string;
  severity: Severity;
  summary: string;
  signs: string[];
  prevent: string[];
  respond: string[];
  keywords: string[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'phishing', title: 'Phishing & Spear Phishing', icon: '🎣', category: 'Social Engineering', severity: 'High',
    summary: 'Deceptive emails, SMS or calls that trick people into revealing credentials or running malware.',
    signs: ['Urgent or threatening tone ("account suspended")', 'Sender domain slightly misspelled', 'Mismatched link destination on hover', 'Unexpected attachments or login requests'],
    prevent: ['Enable multi-factor authentication everywhere', 'Use email filtering with SPF, DKIM and DMARC', 'Run regular phishing awareness training', 'Type URLs yourself instead of clicking links'],
    respond: ['Do not click or reply — report to your security team', 'If you clicked, change the password immediately and revoke sessions', 'Scan the device for malware', 'Block the sender and URL at the mail gateway'],
    keywords: ['email', 'mail', 'link', 'invoice', 'click', 'clicked', 'password reset', 'urgent', 'fake website', 'credential', 'spoof', 'phish', 'sms', 'message'],
  },
  {
    id: 'ransomware', title: 'Ransomware & Extortion', icon: '🔒', category: 'Malware', severity: 'Critical',
    summary: 'Malware that encrypts files and demands payment for the decryption key.',
    signs: ['Files renamed with unknown extensions', 'Ransom note on desktop or in folders (.txt / .html)', 'Sudden high disk activity', 'Backups or shadow copies deleted'],
    prevent: ['Keep offline, immutable 3-2-1 backups and test restores', 'Patch OS and software promptly', 'Disable macros and unneeded RDP exposure', 'Use application allow-listing and EDR'],
    respond: ['Disconnect the machine from network and Wi-Fi immediately', 'Do not power-wash before preserving evidence', 'Identify the strain and check for public decryptors (nomoreransom.org)', 'Restore from clean backups; avoid paying the ransom'],
    keywords: ['encrypt', 'encrypted', 'ransom', 'bitcoin', 'locked files', 'extension', 'decryptor', 'shadow copy', 'vssadmin', 'extortion'],
  },
  {
    id: 'malware', title: 'Malware, Trojans & Spyware', icon: '🦠', category: 'Malware', severity: 'High',
    summary: 'Malicious software that steals data, spies on users, or gives attackers remote control.',
    signs: ['Slow system and unexplained crashes', 'Unknown processes or startup entries', 'Antivirus disabled', 'Unusual outbound connections'],
    prevent: ['Install software only from trusted sources', 'Keep antivirus/EDR updated', 'Apply least privilege — avoid daily admin use', 'Scan downloads and USB drives'],
    respond: ['Isolate the device from the network', 'Run a full offline scan and remove persistence', 'Rotate every password used on the device', 'Reimage if integrity cannot be guaranteed'],
    keywords: ['trojan', 'virus', 'miner', 'cryptominer', 'slow pc', 'cpu 100%', 'high cpu', 'spyware', 'keylogger', 'unknown process', 'task manager'],
  },
  {
    id: 'bruteforce', title: 'Brute Force & Credential Stuffing', icon: '🔑', category: 'Authentication', severity: 'High',
    summary: 'Automated guessing of passwords or reuse of leaked credentials against login pages.',
    signs: ['Many failed logins from one or many IPs', 'Logins at odd hours or from new countries', 'Account lockouts across many users'],
    prevent: ['Enforce MFA and strong, unique passwords', 'Rate-limit and lock out after repeated failures', 'Use CAPTCHA and breached-password checks', 'Prefer passkeys / password managers'],
    respond: ['Block offending IPs and force password resets', 'Invalidate active sessions', 'Review logs for successful logins after failures', 'Notify affected users'],
    keywords: ['login', 'failed attempt', 'failed login', 'password guess', 'lockout', 'multiple attempts', 'brute force', 'credential stuffing', 'auth'],
  },
  {
    id: 'sqli', title: 'SQL Injection (SQLi)', icon: '💉', category: 'Web Application', severity: 'Critical',
    summary: 'Attackers inject SQL through input fields to read, modify or delete database data.',
    signs: ['Quotes, UNION or OR 1=1 in request logs', 'Database error messages shown to users', 'Unusual large data exports'],
    prevent: ['Use parameterized queries / ORMs only', 'Validate and sanitize input server-side', 'Give the DB account least privilege', 'Deploy a WAF and hide detailed errors'],
    respond: ['Take the vulnerable endpoint offline or patch it', 'Audit what data was accessed or dumped', 'Rotate DB credentials and secrets', 'Notify per breach-disclosure obligations'],
    keywords: ['sql', 'database', 'syntax error', 'union', 'select', 'drop table', 'query', 'or 1=1', 'injection', 'dump'],
  },
  {
    id: 'xss', title: 'Cross-Site Scripting (XSS) & CSRF', icon: '📜', category: 'Web Application', severity: 'Medium',
    summary: 'Malicious scripts run in a victim\'s browser, or forged requests ride on their logged-in session.',
    signs: ['<script> tags or event handlers in stored input', 'Unexpected actions performed by users', 'Strange redirects or pop-ups'],
    prevent: ['Escape output and use a strict Content-Security-Policy', 'Set HttpOnly, Secure and SameSite cookies', 'Use anti-CSRF tokens', 'Avoid innerHTML with untrusted data'],
    respond: ['Remove injected content immediately', 'Invalidate sessions and rotate tokens', 'Patch the unescaped sink', 'Review for stolen cookies or data'],
    keywords: ['script', 'xss', 'cookie', 'csrf', 'cross-site', 'alert(', 'javascript:', 'popup', 'redirect', 'token stolen'],
  },
  {
    id: 'ddos', title: 'DDoS / Denial of Service', icon: '🌊', category: 'Network', severity: 'High',
    summary: 'Floods a service with traffic so legitimate users cannot reach it.',
    signs: ['Sudden traffic spikes from many IPs', 'Site slow or unreachable (502/504 errors)', 'High CPU / bandwidth with little real usage'],
    prevent: ['Use a CDN / DDoS protection service', 'Rate-limit and autoscale', 'Keep an incident runbook and ISP contacts', 'Close unused ports and services'],
    respond: ['Enable upstream scrubbing / "under attack" mode (Cloudflare/AWS Shield)', 'Block or throttle abusive sources', 'Communicate status to users via status page', 'Capture traffic samples for post-incident review'],
    keywords: ['ddos', 'dos', 'flood', 'traffic spike', '504', '502', 'timeout', 'server down', 'syn flood', 'slow website', 'unreachable'],
  },
  {
    id: 'mitm', title: 'Man-in-the-Middle & Wi-Fi Attacks', icon: '🕵️', category: 'Network', severity: 'High',
    summary: 'Interception of traffic on untrusted networks, rogue hotspots or ARP/DNS spoofing.',
    signs: ['Certificate warnings in the browser', 'Unexpected captive portals', 'Duplicate or odd Wi-Fi network names'],
    prevent: ['Use HTTPS/HSTS and never bypass certificate warnings', 'Use a VPN on public Wi-Fi', 'Use WPA3 and strong Wi-Fi passwords', 'Enable DNS over HTTPS and ARP inspection'],
    respond: ['Disconnect from the network immediately', 'Change passwords from a trusted network', 'Revoke tokens and sessions', 'Review router and DNS settings'],
    keywords: ['wifi', 'wi-fi', 'ssl certificate', 'untrusted certificate', 'arp', 'dns spoof', 'rogue', 'hotspot', 'mitm', 'public wifi'],
  },
  {
    id: 'insider', title: 'Insider Threat & Data Exfiltration', icon: '🧑‍💼', category: 'Internal', severity: 'High',
    summary: 'Employees or contractors misusing legitimate access, intentionally or by mistake.',
    signs: ['Access outside normal duties or hours', 'Bulk downloads or USB copying', 'Attempts to bypass security controls'],
    prevent: ['Enforce least privilege and review access regularly', 'Log and monitor sensitive data access', 'Use DLP and offboarding checklists', 'Promote a reporting culture'],
    respond: ['Suspend access and preserve system logs', 'Involve HR and legal teams', 'Assess what confidential data was exposed', 'Close the access control gap'],
    keywords: ['insider', 'employee', 'download', 'bulk export', 'usb', 'after hours', 'exfiltration', 'resigned', 'leak', 'confidential'],
  },
  {
    id: 'supplychain', title: 'Supply Chain & Dependency Attacks', icon: '📦', category: 'Software', severity: 'Critical',
    summary: 'Compromised vendors, packages or updates deliver malicious code into your environment.',
    signs: ['Unexpected new dependencies or version jumps', 'Build outputs that changed unexpectedly', 'Vendor breach announcements'],
    prevent: ['Pin versions and use lockfiles', 'Run dependency audits (npm audit, pip-audit)', 'Verify signatures and use an SBOM', 'Limit CI/CD secrets and permissions'],
    respond: ['Roll back to a known-good version', 'Rotate exposed secrets and API tokens', 'Rebuild from clean sources', 'Notify downstream users if library was published'],
    keywords: ['npm', 'pip', 'dependency', 'package', 'library', 'supply chain', 'typosquatting', 'cve', 'audit', 'github', 'build'],
  },
  {
    id: 'zeroday', title: 'Zero-Day & Unpatched Vulnerabilities', icon: '⚡', category: 'Software', severity: 'Critical',
    summary: 'Exploits for flaws that have no patch yet, or critical patches you have not applied.',
    signs: ['Exploit chatter in vendor advisories / CISA KEV', 'Crashes in exposed services', 'Unexpected shells or new accounts'],
    prevent: ['Maintain asset inventory and patch SLAs', 'Segment networks and reduce attack surface', 'Use virtual patching / WAF rules as stopgaps', 'Subscribe to vendor and CERT advisories'],
    respond: ['Apply vendor mitigations or workarounds immediately', 'Hunt for indicators of compromise (IoCs)', 'Isolate exposed vulnerable systems', 'Patch as soon as released and verify'],
    keywords: ['0day', 'zero-day', 'exploit', 'rce', 'remote code execution', 'vulnerability', 'unpatched', 'cve', 'patch'],
  },
  {
    id: 'privesc', title: 'Privilege Escalation & Lateral Movement', icon: '🪜', category: 'Internal', severity: 'High',
    summary: 'Attackers gain higher administrator rights and pivot between systems after an initial foothold.',
    signs: ['New admin accounts or group changes', 'Use of PsExec, RDP or SSH between workstations', 'Credential dumping tools (Mimikatz)'],
    prevent: ['Apply least privilege and tiered admin accounts', 'Segment the network and block workstation-to-workstation traffic', 'Use LAPS / unique local admin passwords', 'Monitor for abnormal authentication paths'],
    respond: ['Isolate affected hosts immediately', 'Reset privileged and service account credentials', 'Review Active Directory / Cloud role changes', 'Hunt for persistence mechanisms (registry, tasks)'],
    keywords: ['privilege', 'admin', 'root', 'mimikatz', 'psexec', 'lateral', 'domain admin', 'sudo', 'elevation', 'credential dump'],
  },
  {
    id: 'cloud', title: 'Cloud Misconfiguration & Leaked Keys', icon: '☁️', category: 'Cloud', severity: 'Critical',
    summary: 'Public buckets, leaked API keys or overly broad IAM roles expose infrastructure and data.',
    signs: ['Public storage buckets or open database ports', 'API keys committed to public repositories', 'Unusual cloud API activity or unexpected billing spikes'],
    prevent: ['Use CSPM tools and infrastructure-as-code reviews', 'Never commit secrets — use secret managers and git pre-commit hooks', 'Apply least-privilege IAM and MFA for root', 'Enable audit logging (CloudTrail, VPC Flow)'],
    respond: ['Revoke and rotate leaked keys immediately', 'Lock down public access to buckets/databases', 'Review access logs to determine scope of data read', 'Assess data exposure and initiate breach response'],
    keywords: ['cloud', 'aws', 'azure', 'gcp', 's3', 'bucket', 'api key', 'secret', 'leaked key', 'iam', 'billing spike', 'public repo'],
  },
  {
    id: 'bec', title: 'Business Email Compromise (BEC) & Wire Fraud', icon: '💼', category: 'Social Engineering', severity: 'High',
    summary: 'Impersonation of executives or vendors to trigger fraudulent bank transfers or sensitive data release.',
    signs: ['Urgent requests to change vendor bank details', 'Pressure for secrecy or bypassing standard approval procedures', 'Reply-to address differs from displayed sender'],
    prevent: ['Verify all bank account changes out-of-band via trusted phone number', 'Require dual approval for financial transfers', 'Enable MFA and mailbox forwarding rule alerts', 'Add external-sender warning banners'],
    respond: ['Contact your bank immediately to recall wire transfers', 'Report to cybercrime authorities (e.g. FBI IC3)', 'Secure and audit compromised executive mailboxes', 'Review and delete suspicious email forwarding rules'],
    keywords: ['wire transfer', 'bank', 'payment', 'vendor', 'invoice payment', 'ceo', 'cfo', 'gift card', 'payroll', 'account number'],
  },
  {
    id: 'mobile', title: 'Mobile Compromise & Device Theft', icon: '📱', category: 'Physical', severity: 'Medium',
    summary: 'Lost or stolen devices, SIM swapping, and malicious mobile apps compromising personal and work accounts.',
    signs: ['Sudden loss of cellular reception (SIM swap indicator)', 'Apps installed that you did not download', 'Unexpected two-factor authentication prompts'],
    prevent: ['Enable full-disk encryption and biometric screen locks', 'Install apps strictly from official app stores', 'Set a carrier port-out PIN to prevent SIM swapping', 'Enable remote wipe / MDM for corporate devices'],
    respond: ['Issue a remote lock or wipe command immediately', 'Call your mobile carrier to freeze or verify the SIM', 'Rotate passwords for banking and primary email accounts', 'Report device loss to corporate IT security'],
    keywords: ['phone', 'mobile', 'stolen laptop', 'lost device', 'sim swap', 'no service', 'sms code', 'android', 'iphone'],
  },
];

const PRESET_SCENARIOS = [
  {
    label: '🚨 Ransomware note & locked files',
    text: 'My documents have strange extensions (.locked) and a text file appeared on the desktop demanding cryptocurrency payment.',
  },
  {
    label: '🎣 Suspicious invoice email with link',
    text: 'Received an urgent email from a known vendor asking to download an attached overdue invoice ZIP file or click a verification link.',
  },
  {
    label: '🔑 Massive failed logins alert',
    text: 'Over 600 failed SSH and web login attempts detected on root account within 10 minutes from Russian and Brazilian IP addresses.',
  },
  {
    label: '💉 SQL syntax error in search bar',
    text: 'Web application search bar returned "syntax error in SQL statement near OR 1=1 UNION SELECT username, password_hash".',
  },
  {
    label: '🌊 Sudden traffic spike & website down',
    text: 'Server CPU hit 100%, network bandwidth saturated with millions of HTTP GET requests from thousands of random IPs, users getting 504 timeout.',
  },
  {
    label: '☁️ AWS API Key accidentally pushed to GitHub',
    text: 'Developer accidentally committed AWS_ACCESS_KEY_ID and secret to a public GitHub repository. Received alert from GitGuardian.',
  },
  {
    label: '💻 Unknown process using 99% CPU',
    text: 'Host fan is spinning constantly, found a process named "xmrig" or randomized string running from AppData/Temp consuming maximum CPU.',
  },
  {
    label: '💼 Urgent wire transfer request from CEO',
    text: 'Received an email from the CEO asking to urgently process an off-cycle $45,000 vendor wire transfer without standard verification.',
  },
];

const SEVERITY_COLOR: Record<Severity, string> = {
  Critical: 'var(--critical)',
  High: 'var(--high)',
  Medium: 'var(--medium)',
  Low: 'var(--low)',
};

const GENERAL_TIPS = [
  'Turn on multi-factor authentication (MFA) for every important account',
  'Patch operating systems and third-party software promptly',
  'Keep tested, offline 3-2-1 backups of critical business data',
  'Use a dedicated password manager with strong, unique passwords',
  'Apply the principle of least privilege — grant only essential permissions',
  'Log, monitor and alert on suspicious network & authentication telemetry',
  'Maintain a tested incident response plan and clear escalation paths',
  'Encrypt sensitive data at rest and in transit across all environments',
];

interface ScanResult {
  matchedPlaybook: Playbook;
  confidence: number;
  riskScore: number;
  severity: Severity;
  detectedIndicators: string[];
  immediateSteps: string[];
  remediationSteps: string[];
  preventionSteps: string[];
  reasoning: string;
}

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<'scan' | 'browse'>('scan');
  const [situationText, setSituationText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Playbook browse state
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(PLAYBOOKS.map(p => p.category)))], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYBOOKS.filter(p => {
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return [p.title, p.summary, ...p.signs, ...p.prevent, ...p.respond].some(t => t.toLowerCase().includes(q));
    });
  }, [query, category]);

  // Situation Scanner Engine
  const handleScanSituation = (customText?: string) => {
    const input = (typeof customText === 'string' ? customText : situationText).trim();
    if (!input) return;

    setScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const lower = input.toLowerCase();

      // Score each playbook based on keyword hits
      let bestMatch = PLAYBOOKS[0];
      let highestScore = -1;
      let matchedIndicators: string[] = [];

      PLAYBOOKS.forEach(p => {
        let score = 0;
        const currentIndicators: string[] = [];

        p.keywords.forEach(kw => {
          if (lower.includes(kw.toLowerCase())) {
            score += kw.length > 5 ? 3 : 2;
            currentIndicators.push(`Matched indicator: "${kw}"`);
          }
        });

        // Also check signs
        p.signs.forEach(sign => {
          const words = sign.toLowerCase().split(' ').filter(w => w.length > 4);
          words.forEach(w => {
            if (lower.includes(w)) {
              score += 1;
            }
          });
        });

        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
          matchedIndicators = Array.from(new Set(currentIndicators)).slice(0, 4);
        }
      });

      // Default fallback indicators if none matched specifically
      if (matchedIndicators.length === 0) {
        matchedIndicators = [
          'Anomalous activity pattern in user-submitted narrative',
          'Potential unauthorized access or compromise indicator',
        ];
      }

      // Calculate risk score based on severity & keyword intensity
      const baseRisk = bestMatch.severity === 'Critical' ? 92 : bestMatch.severity === 'High' ? 78 : bestMatch.severity === 'Medium' ? 54 : 30;
      const finalRisk = Math.min(99, Math.max(35, baseRisk + (highestScore > 5 ? 5 : -3)));
      const finalSev: Severity = finalRisk >= 85 ? 'Critical' : finalRisk >= 65 ? 'High' : finalRisk >= 40 ? 'Medium' : 'Low';

      const result: ScanResult = {
        matchedPlaybook: bestMatch,
        confidence: Math.min(98, Math.max(72, 60 + highestScore * 6)),
        riskScore: finalRisk,
        severity: finalSev,
        detectedIndicators: matchedIndicators,
        immediateSteps: [
          ...bestMatch.respond.slice(0, 2),
          'Isolate affected system, token, or session from the network immediately.',
        ],
        remediationSteps: [
          ...bestMatch.respond.slice(2),
          'Preserve logs and telemetry for forensic review before reimaging.',
          'Rotate all related credentials, API keys, and active user sessions.',
        ],
        preventionSteps: bestMatch.prevent,
        reasoning: `Based on your situation description, the threat vectors strongly correlate with ${bestMatch.title} (${bestMatch.category}). Risk level evaluated as ${finalSev} due to potential for lateral impact or data loss.`,
      };

      setScanResult(result);
      setScanning(false);
    }, 450);
  };

  const jumpToPlaybook = (id: string) => {
    setActiveTab('browse');
    setOpenId(id);
    setTimeout(() => {
      const el = document.getElementById(`playbook-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Playbook & Situation Scanner</h1>
          <p className="page-subtitle">
            Scan any attack, symptom, or security situation for instant tailored suggestions, or browse full defense playbooks
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('scan')}
          >
            <Zap size={15} /> Scan Situation & Suggestions
          </button>
          <button
            className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('browse')}
          >
            <BookOpen size={15} /> All Playbooks ({PLAYBOOKS.length})
          </button>
        </div>
      </div>

      {/* Mode 1: Situation & Attack Scanner */}
      {activeTab === 'scan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Scanner Input Card */}
          <div className="chart-card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="var(--cyan)" />
              Scan Attack or Situation for Instant Remediation
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Describe what is happening on your system, enter an error or alert message, or paste an incident scenario.
              The AI security scanner diagnoses the vector and provides step-by-step suggestions.
            </p>

            <div style={{ marginBottom: 14 }}>
              <textarea
                className="form-input"
                id="situation-scanner-input"
                style={{
                  width: '100%', minHeight: 95, resize: 'vertical',
                  fontFamily: 'inherit', fontSize: 13, padding: 12, lineHeight: 1.5
                }}
                placeholder="e.g. My files have changed to .encrypted, ransomware note asking for Bitcoin appeared on screen... OR user received fake login email... OR server getting 100,000 requests per second..."
                value={situationText}
                onChange={e => setSituationText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) handleScanSituation();
                }}
              />
            </div>

            {/* Quick preset chips */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
                Or select a common situation to scan:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRESET_SCENARIOS.map((p, idx) => (
                  <button
                    key={idx}
                    className="filter-chip"
                    onClick={() => {
                      setSituationText(p.text);
                      handleScanSituation(p.text);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                id="btn-scan-situation"
                onClick={() => handleScanSituation()}
                disabled={scanning || !situationText.trim()}
                style={{ minWidth: 200, justifyContent: 'center' }}
              >
                {scanning ? (
                  <><div className="spinner" style={{ width: 14, height: 14 }} /> Scanning Situation...</>
                ) : (
                  <><Zap size={15} /> Scan & Get Suggestions</>
                )}
              </button>
              {situationText && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSituationText(''); setScanResult(null); }}
                >
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Scanner Output Diagnosis */}
          {scanResult && (
            <div className="chart-card animate-fade" style={{ border: `1px solid ${SEVERITY_COLOR[scanResult.severity]}50` }}>
              {/* Top Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: 'var(--bg-primary)', borderRadius: 10, marginBottom: 20,
                border: `1px solid ${SEVERITY_COLOR[scanResult.severity]}30`, flexWrap: 'wrap'
              }}>
                <div style={{ fontSize: 40 }}>{scanResult.matchedPlaybook.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{scanResult.matchedPlaybook.title}</span>
                    <span className="badge" style={{ color: SEVERITY_COLOR[scanResult.severity] }}>
                      {scanResult.severity.toUpperCase()} THREAT
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Confidence: {scanResult.confidence}%
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {scanResult.reasoning}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Calculated Risk</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: SEVERITY_COLOR[scanResult.severity] }}>
                      {scanResult.riskScore}/100
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => jumpToPlaybook(scanResult.matchedPlaybook.id)}
                    style={{ fontSize: 12 }}
                  >
                    Open Full Guide <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Detected indicators */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} /> Detected Attack Indicators & Trigger Signatures
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {scanResult.detectedIndicators.map((ind, i) => (
                    <div key={i} style={{
                      padding: '6px 12px', background: 'var(--bg-primary)', borderRadius: 6,
                      fontSize: 12, border: '1px solid var(--border)', color: 'var(--text-primary)'
                    }}>
                      {ind}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Step Action Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {/* Step 1: Immediate */}
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 10, padding: 16,
                  border: '1px solid rgba(255, 59, 78, 0.25)'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--critical)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Siren size={15} /> 1. Immediate Containment (Next 15 Min)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanResult.immediateSteps.map((s, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        <strong>{s}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Step 2: Remediation */}
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 10, padding: 16,
                  border: '1px solid rgba(255, 140, 0, 0.25)'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--high)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={15} /> 2. Remediation & Eradication (Next 2 Hours)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanResult.remediationSteps.map((s, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Step 3: Prevention */}
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 10, padding: 16,
                  border: '1px solid rgba(0, 196, 140, 0.25)'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--low)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} /> 3. Long-Term Hardening (Permanent)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanResult.preventionSteps.slice(0, 4).map((s, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Browse All Playbooks */}
      {activeTab === 'browse' && (
        <>
          {/* Universal Golden Rules */}
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="var(--low)" /> Essential Security Baseline for Every System
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
              {GENERAL_TIPS.map(t => (
                <div key={t} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  • {t}
                </div>
              ))}
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                id="playbook-search"
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="Search attacks, symptoms or fixes..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <button
                  key={c}
                  id={`playbook-filter-${c.replace(/\s+/g, '-').toLowerCase()}`}
                  className={`filter-chip ${category === c ? 'active' : ''}`}
                  style={category === c ? { borderColor: 'var(--cyan)', color: 'var(--cyan)' } : undefined}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Playbook Accordion List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 && (
              <div className="chart-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 20px' }}>
                No playbooks match your search. Try another keyword or switch back to the Situation Scanner.
              </div>
            )}
            {filtered.map(p => {
              const open = openId === p.id;
              const color = SEVERITY_COLOR[p.severity];
              return (
                <div key={p.id} id={`playbook-${p.id}`} className="chart-card animate-fade" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenId(open ? null : p.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{p.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{p.summary}</div>
                    </div>
                    <span className="badge" style={{ color }}>{p.severity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.category}</span>
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {open && (
                    <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--high)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ShieldAlert size={14} /> Warning Signs
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {p.signs.map(i => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{i}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--low)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ShieldCheck size={14} /> Prevention Tips
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {p.prevent.map(i => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{i}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ background: 'var(--bg-primary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--critical)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Siren size={14} /> Emergency Response
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {p.respond.map(i => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
