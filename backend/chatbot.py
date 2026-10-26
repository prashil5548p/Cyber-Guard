"""CyberGuard AI assistant: an offline, rule-based security chatbot that is aware of
the live alert data and can explain threats and guide the user to the scanners."""
import re
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from database import ThreatAlert, SecurityEvent, PhishingCheck

KNOWLEDGE = [
    (("password", "passphrase", "credential"),
     "🔑 **Password hygiene**\n- Use 14+ character unique passphrases\n- Enable MFA everywhere\n- Use a password manager\n- Never reuse passwords across sites\n- Rotate immediately after any suspected breach"),
    (("ransomware",),
     "🔒 **Ransomware response**\n1. Isolate the machine from the network\n2. Do NOT pay or reboot\n3. Identify the strain & scope via the File Scanner\n4. Restore from offline backups\n5. Reset all credentials\n\nPrevention: offline backups, patching, disabling macros, least privilege."),
    (("phishing", "phish", "suspicious email", "scam"),
     "🎣 **Phishing defence**\n- Check sender domain & hover links\n- Beware urgency and money lures\n- Never enter credentials from email links\n\nPaste the message into the **Phishing Detector**, or the link into the **Website Scanner**."),
    (("malware", "virus", "trojan", "spyware", "keylogger"),
     "🦠 **Malware handling**\n- Run the **PC Scanner** and **App Scanner** to spot rogue processes\n- Upload the suspicious file to the **File Scanner**\n- Disconnect from the network if active C2 traffic is suspected\n- Reinstall from a clean image if root-level compromise is confirmed"),
    (("firewall", "port", "open port"),
     "🧱 **Firewall & ports**\nClose unused ports, block inbound RDP/SMB/Telnet from the internet, and enable the host firewall. Use the **IP Scanner** on localhost/LAN hosts to see what is exposed."),
    (("ddos", "dos attack", "flood"),
     "🌊 **DDoS mitigation**\nUse a CDN/WAF with rate limiting, enable SYN cookies, keep upstream ISP contacts ready and watch connections-per-minute in the Anomaly page."),
    (("sql injection", "sqli", "xss", "csrf", "owasp"),
     "🕸️ **Web app security**\nUse parameterised queries, escape output, set CSP + SameSite cookies, validate input server-side. Run the **Website Scanner** to audit headers and TLS."),
    (("mfa", "2fa", "two factor", "multi-factor"),
     "📲 **MFA**\nPrefer authenticator apps or hardware keys over SMS. Enforce MFA for admins first."),
    (("vpn", "wifi", "wi-fi", "public network"),
     "📡 **Network safety**\nAvoid sensitive logins on public Wi-Fi, use a trusted VPN, forget unknown networks and disable auto-join."),
    (("backup",),
     "💾 **Backups**\nFollow 3-2-1: 3 copies, 2 media types, 1 offline/off-site. Test restores quarterly."),
]

CAPABILITIES = (
    "I can help with:\n"
    "- 📊 **Status** — \"give me a summary\", \"show critical alerts\", \"latest alerts\"\n"
    "- 🔍 **Explain** — \"explain alert 12\"\n"
    "- 🛡️ **Advice** — passwords, phishing, ransomware, malware, firewall, MFA, backups…\n"
    "- 🧭 **Scanners** — \"how do I scan a file / website / IP / PC / apps?\"\n"
    "- 👑 **Admin** — \"how do admin roles work?\""
)

SCAN_HELP = {
    "file": "📁 Open **File Scanner**, drop a file. I compute SHA-256, detect disguised executables, double extensions, high entropy and malicious strings.",
    "website": "🌐 Open **Website Scanner**, enter a URL. I check HTTPS/TLS, security headers, phishing patterns, hidden iframes and obfuscated JS.",
    "ip": "📡 Open **IP Scanner**, enter an address. Localhost/private hosts get a live port scan; public IPs get classification only.",
    "pc": "💻 Open **PC Scanner** (admin only) for CPU/RAM/disk health, exposed ports, firewall state and risky processes.",
    "app": "🧩 Open **App Scanner** (admin only) to inspect running applications for hacking tools, risky paths and obfuscated scripts.",
}


def _alert_line(a: ThreatAlert) -> str:
    return f"- **#{a.alert_id}** [{a.severity}] {a.threat_type} — risk {a.risk_score:.0f}, {a.status}"


def _summary(db: Session) -> str:
    alerts = db.query(ThreatAlert).all()
    events = db.query(SecurityEvent).count()
    if not alerts:
        return "✅ No alerts yet. Run a scan or simulation to generate data."
    sev = {s: sum(1 for a in alerts if a.severity == s) for s in ("Critical", "High", "Medium", "Low")}
    open_n = sum(1 for a in alerts if a.status == "Open")
    phish = db.query(PhishingCheck).filter(PhishingCheck.prediction == "Phishing").count()
    posture = "🔴 Elevated" if sev["Critical"] else "🟠 Guarded" if sev["High"] else "🟢 Stable"
    return (f"📊 **Security summary** — posture: {posture}\n"
            f"- Events logged: **{events}**\n- Alerts: **{len(alerts)}** ({open_n} open)\n"
            f"- Critical **{sev['Critical']}** · High **{sev['High']}** · Medium **{sev['Medium']}** · Low **{sev['Low']}**\n"
            f"- Phishing messages caught: **{phish}**")


def reply(message: str, db: Session, user) -> Dict[str, Any]:
    m = message.lower().strip()
    suggestions: List[str] = ["Give me a summary", "Show critical alerts", "How do I scan a file?", "Phishing tips"]

    if not m:
        return {"reply": CAPABILITIES, "suggestions": suggestions}

    if re.search(r"\b(hi|hello|hey|good (morning|evening))\b", m) and len(m) < 30:
        return {"reply": f"👋 Hi {user.name.split()[0]}! I'm the CyberGuard assistant.\n\n{CAPABILITIES}", "suggestions": suggestions}

    if "help" in m and len(m) < 25 or "what can you do" in m:
        return {"reply": CAPABILITIES, "suggestions": suggestions}

    # Explain a specific alert
    num = re.search(r"(?:alert|#)\s*#?(\d+)", m)
    if num and any(w in m for w in ("explain", "alert", "what", "why", "#")):
        a = db.query(ThreatAlert).filter(ThreatAlert.alert_id == int(num.group(1))).first()
        if not a:
            return {"reply": f"I couldn't find alert #{num.group(1)}.", "suggestions": suggestions}
        return {"reply": (f"🔍 **Alert #{a.alert_id}** — {a.threat_type}\n- Severity: **{a.severity}** (risk {a.risk_score:.0f}/100)\n"
                          f"- Status: {a.status}\n- Why: {a.explanation}\n- Recommended: {a.recommendation}"),
                "suggestions": ["Give me a summary", "Latest alerts"]}

    if "critical" in m or "high" in m and "alert" in m:
        sev = "Critical" if "critical" in m else "High"
        rows = db.query(ThreatAlert).filter(ThreatAlert.severity == sev).order_by(ThreatAlert.created_at.desc()).limit(5).all()
        if not rows:
            return {"reply": f"🟢 No {sev} alerts right now.", "suggestions": suggestions}
        return {"reply": f"🚨 **Latest {sev} alerts**\n" + "\n".join(_alert_line(a) for a in rows)
                         + "\n\nAsk \"explain alert <id>\" for details.", "suggestions": ["Give me a summary"]}

    if any(w in m for w in ("latest", "recent", "newest")) or "open alerts" in m:
        q = db.query(ThreatAlert)
        if "open" in m:
            q = q.filter(ThreatAlert.status == "Open")
        rows = q.order_by(ThreatAlert.created_at.desc()).limit(5).all()
        if not rows:
            return {"reply": "No alerts found.", "suggestions": suggestions}
        return {"reply": "🕒 **Recent alerts**\n" + "\n".join(_alert_line(a) for a in rows), "suggestions": ["Give me a summary"]}

    if any(w in m for w in ("summary", "status", "overview", "posture", "how are we", "dashboard")):
        return {"reply": _summary(db), "suggestions": ["Show critical alerts", "Latest alerts"]}

    # Scanner help
    if "scan" in m:
        for key, aliases in (("file", ("file", "upload")), ("website", ("website", "url", "site", "web")),
                             ("ip", ("ip", "address", "host")), ("app", ("app", "process", "program")),
                             ("pc", ("pc", "computer", "system", "machine"))):
            if any(re.search(rf"\b{a}\w*", m) for a in aliases):
                return {"reply": SCAN_HELP[key], "suggestions": suggestions}
        return {"reply": "🧭 **Scanners**\n" + "\n".join(SCAN_HELP.values()), "suggestions": suggestions}

    if "admin" in m or "role" in m:
        return {"reply": ("👑 **Roles**\n- **Analyst**: alerts, phishing, anomaly, file/website/IP scans, chat\n"
                          "- **Admin**: everything above + PC/App scanners, user management, role changes and audit logs\n\n"
                          f"You are signed in as **{user.role}**."), "suggestions": suggestions}

    for keys, text in KNOWLEDGE:
        if any(k in m for k in keys):
            return {"reply": text, "suggestions": suggestions}

    if "thank" in m:
        return {"reply": "You're welcome! Stay safe 🛡️", "suggestions": suggestions}

    return {"reply": "🤔 I'm not sure about that one.\n\n" + CAPABILITIES, "suggestions": suggestions}
