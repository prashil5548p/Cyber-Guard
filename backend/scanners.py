"""Security scanners for CyberGuard AI.

Every scanner returns a dict with: risk_score (0-100), severity, threat_type,
findings (list of {title, detail, severity}), summary, recommendation, details.
"""
import hashlib
import ipaddress
import math
import os
import re
import socket
import ssl
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
import psutil

SEV_WEIGHT = {"Info": 0, "Low": 8, "Medium": 18, "High": 32, "Critical": 50}


def severity_from_score(score: float) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _finding(title: str, detail: str, severity: str = "Info") -> Dict[str, str]:
    return {"title": title, "detail": detail, "severity": severity}


def _finalize(threat_type: str, findings: List[Dict[str, str]], details: Dict[str, Any],
              clean_msg: str, bad_rec: str, good_rec: str) -> Dict[str, Any]:
    score = min(100.0, float(sum(SEV_WEIGHT.get(f["severity"], 0) for f in findings)))
    severity = severity_from_score(score)
    risky = [f for f in findings if f["severity"] in ("Medium", "High", "Critical")]
    return {
        "threat_type": threat_type,
        "risk_score": round(score, 1),
        "severity": severity,
        "findings": findings,
        "summary": f"{len(risky)} issue(s) detected." if risky else clean_msg,
        "explanation": "; ".join(f["title"] for f in risky) or clean_msg,
        "recommendation": bad_rec if risky else good_rec,
        "details": details,
    }


# ── PC scan ──────────────────────────────────────────────────────────────────

RISKY_PORTS = {
    21: "FTP (unencrypted)", 23: "Telnet (unencrypted)", 135: "MS RPC", 139: "NetBIOS",
    445: "SMB", 1433: "MS SQL", 3306: "MySQL", 3389: "Remote Desktop (RDP)",
    4444: "Metasploit default", 5900: "VNC", 6667: "IRC (botnet C2)", 31337: "Back Orifice",
}


def scan_pc() -> Dict[str, Any]:
    findings: List[Dict[str, str]] = []
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    try:
        root = os.path.abspath(os.sep)
        disk = psutil.disk_usage(root)
        disk_pct = disk.percent
    except Exception:
        disk_pct = 0.0

    if cpu > 90:
        findings.append(_finding("Sustained high CPU", f"CPU at {cpu}% — possible cryptominer or runaway process", "Medium"))
    if mem.percent > 92:
        findings.append(_finding("Memory nearly exhausted", f"{mem.percent}% RAM in use", "Low"))
    if disk_pct > 95:
        findings.append(_finding("Disk almost full", f"{disk_pct}% used", "Low"))

    # Listening ports
    listening = []
    try:
        for c in psutil.net_connections(kind="inet"):
            if c.status == psutil.CONN_LISTEN and c.laddr:
                exposed = c.laddr.ip in ("0.0.0.0", "::")
                listening.append({"port": c.laddr.port, "address": c.laddr.ip, "pid": c.pid, "exposed": exposed})
    except (psutil.AccessDenied, PermissionError):
        findings.append(_finding("Limited visibility", "Run backend as administrator for full port inventory", "Info"))
    seen = set()
    for l in sorted(listening, key=lambda x: x["port"]):
        if l["port"] in RISKY_PORTS and l["exposed"] and l["port"] not in seen:
            seen.add(l["port"])
            sev = "High" if l["port"] in (23, 4444, 6667, 31337, 3389) else "Medium"
            findings.append(_finding(f"Risky port {l['port']} exposed", f"{RISKY_PORTS[l['port']]} listening on all interfaces", sev))

    # Firewall (Windows)
    firewall = None
    if os.name == "nt":
        try:
            import subprocess
            out = subprocess.run(["netsh", "advfirewall", "show", "allprofiles", "state"],
                                 capture_output=True, text=True, timeout=8).stdout
            states = re.findall(r"State\s+(\w+)", out)
            firewall = states
            if states and any(s.upper() == "OFF" for s in states):
                findings.append(_finding("Firewall disabled", "One or more Windows Firewall profiles are OFF", "High"))
        except Exception:
            pass

    uptime_days = (time.time() - psutil.boot_time()) / 86400
    if uptime_days > 30:
        findings.append(_finding("Long uptime", f"{uptime_days:.0f} days without reboot — pending patches likely", "Low"))

    app_result = scan_apps()
    for f in app_result["findings"]:
        if f["severity"] in ("Medium", "High", "Critical"):
            findings.append(f)

    details = {
        "hostname": socket.gethostname(),
        "cpu_percent": cpu,
        "memory_percent": mem.percent,
        "disk_percent": disk_pct,
        "uptime_days": round(uptime_days, 1),
        "listening_ports": listening[:60],
        "firewall": firewall,
        "process_count": app_result["details"]["process_count"],
    }
    return _finalize("PC Scan", findings, details,
                     "System looks healthy.",
                     "Review the flagged items, close unneeded ports and investigate suspicious processes.",
                     "No action needed. Keep your OS and security tools updated.")


# ── App / process scan ───────────────────────────────────────────────────────

SUSPICIOUS_NAMES = {
    "mimikatz": "Credential dumping tool", "nc.exe": "Netcat (remote shell)", "ncat": "Netcat variant",
    "psexec": "Remote execution tool", "meterpreter": "Metasploit payload", "xmrig": "Crypto miner",
    "cryptominer": "Crypto miner", "keylogger": "Keylogger", "lazagne": "Password recovery tool",
    "procdump": "Memory dumping tool", "wce.exe": "Windows Credential Editor", "netcat": "Netcat",
    "cobaltstrike": "C2 framework", "beacon.exe": "C2 beacon",
}
SUSPICIOUS_PATHS = ("\\temp\\", "\\appdata\\local\\temp", "/tmp/", "\\downloads\\", "\\users\\public\\", "$recycle.bin")
LOLBINS = {"powershell.exe", "cmd.exe", "wscript.exe", "cscript.exe", "mshta.exe", "regsvr32.exe", "rundll32.exe"}


def scan_apps(target: Optional[str] = None) -> Dict[str, Any]:
    target_l = (target or "").strip().lower() or None
    findings: List[Dict[str, str]] = []
    procs = []
    for p in psutil.process_iter(["pid", "name", "exe", "username", "cpu_percent", "memory_percent", "create_time"]):
        try:
            info = p.info
            name = (info.get("name") or "").lower()
            exe = (info.get("exe") or "")
            exe_l = exe.lower()
            flags: List[str] = []
            if target_l and target_l not in name and target_l not in exe_l:
                continue
            for key, why in SUSPICIOUS_NAMES.items():
                if key in name or key in exe_l:
                    flags.append(why)
                    findings.append(_finding(f"Known malicious/hacking tool: {info.get('name')}", f"PID {info['pid']} — {why}", "Critical"))
                    break
            if exe and any(s in exe_l for s in SUSPICIOUS_PATHS):
                flags.append("Runs from temp/download location")
                findings.append(_finding(f"Process in risky path: {info.get('name')}", f"PID {info['pid']} at {exe}", "Medium"))
            if name in LOLBINS:
                try:
                    cmd = " ".join(p.cmdline()).lower()
                except Exception:
                    cmd = ""
                if any(t in cmd for t in ("-enc", "-encodedcommand", "downloadstring", "invoke-expression", "iex ", "-w hidden", "bypass")):
                    flags.append("Obfuscated/hidden script execution")
                    findings.append(_finding(f"Suspicious {info.get('name')} command line", f"PID {info['pid']}: {cmd[:140]}", "High"))
            procs.append({
                "pid": info["pid"], "name": info.get("name"), "exe": exe, "user": info.get("username"),
                "memory_percent": round(info.get("memory_percent") or 0, 2), "flags": flags,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    procs.sort(key=lambda x: (len(x["flags"]), x["memory_percent"]), reverse=True)
    details = {"process_count": len(procs), "processes": procs[:40], "flagged": [p for p in procs if p["flags"]][:30]}
    if target_l:
        details["target"] = target
        if not procs:
            findings.append(_finding(f"'{target}' is not running", "No running process matches this application name.", "Info"))
        return _finalize(f"Application Scan: {target}", findings, details,
                         f"{len(procs)} process(es) matching '{target}' checked — none suspicious." if procs
                         else f"No running process matches '{target}'.",
                         f"Terminate and investigate '{target}'; scan the host with an antivirus.",
                         f"'{target}' looks safe.")
    return _finalize("Application Scan", findings, details,
                     f"{len(procs)} running applications checked — none suspicious.",
                     "Terminate and investigate flagged applications; scan the host with an antivirus.",
                     "No suspicious applications found.")


# ── IP scan ──────────────────────────────────────────────────────────────────

COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 135: "RPC",
    139: "NetBIOS", 143: "IMAP", 443: "HTTPS", 445: "SMB", 1433: "MSSQL", 3306: "MySQL",
    3389: "RDP", 5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 27017: "MongoDB",
}
DANGEROUS_OPEN = {21: "High", 23: "Critical", 135: "Medium", 139: "Medium", 445: "High", 1433: "High",
                  3306: "Medium", 3389: "High", 5900: "High", 6379: "High", 27017: "High", 5432: "Medium"}


def _probe(ip: str, port: int, timeout: float = 0.6) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=timeout):
            return True
    except Exception:
        return False


def scan_ip(ip_text: str) -> Dict[str, Any]:
    try:
        ip = ipaddress.ip_address(ip_text.strip())
    except ValueError:
        raise ValueError("Invalid IP address")
    findings: List[Dict[str, str]] = []
    scope = ("loopback" if ip.is_loopback else "private" if ip.is_private else "multicast" if ip.is_multicast
             else "reserved" if ip.is_reserved else "public")

    hostname = None
    try:
        hostname = socket.gethostbyaddr(str(ip))[0]
    except Exception:
        pass

    open_ports: List[Dict[str, Any]] = []
    port_scanned = ip.is_loopback or ip.is_private
    if port_scanned:
        with ThreadPoolExecutor(max_workers=24) as ex:
            results = list(ex.map(lambda p: (p, _probe(str(ip), p)), COMMON_PORTS))
        for port, is_open in results:
            if is_open:
                open_ports.append({"port": port, "service": COMMON_PORTS[port]})
                if port in DANGEROUS_OPEN:
                    findings.append(_finding(f"Open {COMMON_PORTS[port]} (port {port})",
                                             "Commonly attacked service exposed", DANGEROUS_OPEN[port]))
    else:
        findings.append(_finding("Active port scan skipped",
                                 "Port scanning is limited to localhost/private-range hosts you control", "Info"))
        if scope == "public":
            findings.append(_finding("Public address", "Reputation is not verified offline — cross-check with a threat feed", "Low"))
    if len(open_ports) >= 6:
        findings.append(_finding("Large attack surface", f"{len(open_ports)} common services open", "Medium"))

    # Is this IP actively connected to this machine?
    connected = False
    try:
        connected = any(c.raddr and c.raddr.ip == str(ip) for c in psutil.net_connections(kind="inet"))
    except Exception:
        pass
    if connected and scope == "public":
        findings.append(_finding("Active connection to this machine", "This public IP currently has a live connection to the host", "Low"))

    details = {"ip": str(ip), "version": ip.version, "scope": scope, "hostname": hostname,
               "open_ports": open_ports, "port_scanned": port_scanned, "connected": connected}
    return _finalize("IP Scan", findings, details, "No threats identified for this IP.",
                     "Close or firewall the exposed services and restrict access by IP.",
                     "Host looks clean. Continue monitoring.")


# ── File scan ────────────────────────────────────────────────────────────────

EICAR = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
DANGEROUS_EXT = {".exe", ".scr", ".bat", ".cmd", ".com", ".pif", ".vbs", ".js", ".jse", ".wsf", ".ps1", ".jar", ".msi", ".dll", ".lnk", ".hta"}
DOC_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png", ".gif", ".mp3", ".mp4"}
SUSPICIOUS_STRINGS = [
    (b"powershell -enc", "Encoded PowerShell"), (b"invoke-expression", "PowerShell IEX"),
    (b"downloadstring", "Remote payload download"), (b"cmd.exe /c", "Shell command execution"),
    (b"createremotethread", "Process injection API"), (b"virtualallocex", "Process injection API"),
    (b"writeprocessmemory", "Process injection API"), (b"keylog", "Keylogging reference"),
    (b"mimikatz", "Credential theft tool"), (b"/bin/sh -i", "Reverse shell"), (b"nc -e", "Netcat reverse shell"),
    (b"wscript.shell", "Windows script host"), (b"autoopen", "Auto-run macro"), (b"document_open", "Auto-run macro"),
    (b"vbaproject", "Embedded VBA macro"), (b"/javascript", "PDF JavaScript"), (b"/launch", "PDF launch action"),
    (b"bitcoin", "Ransom/crypto reference"), (b"your files have been encrypted", "Ransom note"),
]
MAGIC = {b"MZ": "Windows executable (PE)", b"\x7fELF": "Linux executable (ELF)", b"PK\x03\x04": "ZIP/Office archive",
         b"%PDF": "PDF document", b"\xd0\xcf\x11\xe0": "Legacy Office document", b"#!": "Script"}


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in counts if c)


def scan_file(filename: str, data: bytes) -> Dict[str, Any]:
    findings: List[Dict[str, str]] = []
    sha256 = hashlib.sha256(data).hexdigest()
    md5 = hashlib.md5(data).hexdigest()
    name = os.path.basename(filename or "unknown")
    ext = os.path.splitext(name)[1].lower()
    entropy = _entropy(data[:2_000_000])
    lower = data[:5_000_000].lower()

    if EICAR in data:
        findings.append(_finding("EICAR test signature", "Standard antivirus test file detected", "Critical"))

    ftype = next((desc for sig, desc in MAGIC.items() if data.startswith(sig)), "Unknown / plain data")
    if data.startswith(b"MZ") and ext not in (".exe", ".dll", ".scr", ".sys", ".com"):
        findings.append(_finding("Disguised executable", f"File has executable header but extension '{ext or 'none'}'", "High"))
    if ext in DANGEROUS_EXT:
        findings.append(_finding(f"Risky file type ({ext})", "Executable/script format commonly used to deliver malware", "Medium"))
    parts = name.lower().split(".")
    if len(parts) > 2 and "." + parts[-2] in DOC_EXT and "." + parts[-1] in DANGEROUS_EXT:
        findings.append(_finding("Double extension", f"'{name}' pretends to be a document", "High"))
    if entropy > 7.5 and len(data) > 4096 and ext not in (".zip", ".jpg", ".jpeg", ".png", ".mp3", ".mp4", ".gz", ".7z", ".rar", ".docx", ".xlsx", ".pptx", ".pdf"):
        findings.append(_finding("High entropy", f"Entropy {entropy:.2f}/8 suggests packing or encryption", "Medium"))

    matched = []
    for needle, label in SUSPICIOUS_STRINGS:
        if needle in lower and label not in matched:
            matched.append(label)
    if matched:
        sev = "High" if len(matched) >= 3 else "Medium"
        findings.append(_finding("Suspicious content", ", ".join(matched), sev))
    if len(data) == 0:
        findings.append(_finding("Empty file", "File has no content", "Low"))

    details = {"filename": name, "size_bytes": len(data), "sha256": sha256, "md5": md5,
               "detected_type": ftype, "entropy": round(entropy, 2), "matched_indicators": matched}
    return _finalize("File Scan", findings, details, "No malicious indicators found.",
                     "Do not open this file. Delete or quarantine it and scan with a full antivirus.",
                     "File appears safe based on static analysis.")


# ── Website scan ─────────────────────────────────────────────────────────────

SECURITY_HEADERS = {
    "strict-transport-security": ("Missing HSTS", "Medium"),
    "content-security-policy": ("Missing Content-Security-Policy", "Low"),
    "x-frame-options": ("Missing X-Frame-Options (clickjacking)", "Low"),
    "x-content-type-options": ("Missing X-Content-Type-Options", "Low"),
}
BAD_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".work", ".zip", ".ru", ".cn"}
URL_KEYWORDS = ("login", "verify", "secure", "account", "update", "bank", "paypal", "wallet", "signin", "confirm")


def _host_is_private(host: str) -> bool:
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return True
    except Exception:
        return False
    return False


def scan_website(url: str) -> Dict[str, Any]:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    parsed = urlparse(url)
    host = parsed.hostname
    if not host:
        raise ValueError("Invalid URL")
    if _host_is_private(host):
        raise ValueError("Scanning private/internal addresses is not allowed")

    findings: List[Dict[str, str]] = []
    details: Dict[str, Any] = {"url": url, "host": host}

    # URL heuristics
    if parsed.scheme == "http":
        findings.append(_finding("No HTTPS", "Traffic is unencrypted", "High"))
    if any(host.endswith(t) for t in BAD_TLDS):
        findings.append(_finding("High-abuse TLD", f"'{host}' uses a TLD frequently seen in phishing", "Medium"))
    if re.match(r"^\d+\.\d+\.\d+\.\d+$", host):
        findings.append(_finding("IP-address URL", "Legitimate sites rarely use raw IPs", "Medium"))
    if "@" in url.split("//", 1)[-1].split("/")[0]:
        findings.append(_finding("Credentials in URL", "'@' trick is used to disguise the real host", "High"))
    if host.count(".") >= 4:
        findings.append(_finding("Excessive subdomains", host, "Low"))
    if host.startswith("xn--") or ".xn--" in host:
        findings.append(_finding("Punycode domain", "Possible homograph/lookalike attack", "High"))
    kw = [k for k in URL_KEYWORDS if k in url.lower()]
    if len(kw) >= 2:
        findings.append(_finding("Phishing-style keywords in URL", ", ".join(kw), "Medium"))

    # TLS certificate
    if parsed.scheme == "https":
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((host, parsed.port or 443), timeout=6) as s:
                with ctx.wrap_socket(s, server_hostname=host) as ss:
                    cert = ss.getpeercert()
                    details["tls_version"] = ss.version()
            exp = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
            days = (exp - datetime.utcnow()).days
            details["cert_expires_in_days"] = days
            details["cert_issuer"] = dict(x[0] for x in cert.get("issuer", ())).get("organizationName")
            if days < 0:
                findings.append(_finding("Certificate expired", f"Expired {-days} days ago", "High"))
            elif days < 14:
                findings.append(_finding("Certificate expiring soon", f"{days} days left", "Low"))
            if ss.version() in ("TLSv1", "TLSv1.1"):
                findings.append(_finding("Outdated TLS", ss.version(), "Medium"))
        except ssl.SSLCertVerificationError as e:
            findings.append(_finding("Invalid TLS certificate", str(e.verify_message), "Critical"))
        except Exception as e:
            findings.append(_finding("TLS handshake failed", str(e)[:100], "Medium"))

    # HTTP fetch
    try:
        with httpx.Client(follow_redirects=True, timeout=8, max_redirects=5, verify=False,
                          headers={"User-Agent": "CyberGuardAI-Scanner/1.0"}) as client:
            r = client.get(url)
        details["status_code"] = r.status_code
        details["final_url"] = str(r.url)
        details["redirects"] = [str(h.url) for h in r.history]
        if _host_is_private(urlparse(str(r.url)).hostname or ""):
            findings.append(_finding("Redirects to internal address", str(r.url), "High"))
        if urlparse(str(r.url)).hostname != host and r.history:
            findings.append(_finding("Cross-domain redirect", f"Ends at {urlparse(str(r.url)).hostname}", "Low"))
        headers = {k.lower(): v for k, v in r.headers.items()}
        missing = []
        if parsed.scheme == "https":
            for h, (msg, sev) in SECURITY_HEADERS.items():
                if h not in headers:
                    missing.append(msg)
                    findings.append(_finding(msg, "Recommended security header absent", sev))
        details["missing_headers"] = missing
        if "server" in headers and re.search(r"\d+\.\d+", headers["server"]):
            findings.append(_finding("Server version disclosed", headers["server"], "Low"))
        body = r.text[:300_000].lower()
        if 'type="password"' in body or "type='password'" in body:
            details["has_login_form"] = True
            if r.url.scheme == "http":
                findings.append(_finding("Password form over HTTP", "Credentials sent unencrypted", "Critical"))
            if len(kw) >= 1 and any(t in host for t in BAD_TLDS):
                findings.append(_finding("Likely phishing login page", "Login form on a high-abuse domain", "High"))
        if re.search(r"eval\(\s*(unescape|atob)\(", body) or "document.write(unescape(" in body:
            findings.append(_finding("Obfuscated JavaScript", "eval(unescape/atob) pattern found", "High"))
        if re.search(r"<iframe[^>]+(width=[\"']?0|height=[\"']?0|display:\s*none)", body):
            findings.append(_finding("Hidden iframe", "Invisible iframe often used for drive-by downloads", "High"))
        if "coinhive" in body or "cryptonight" in body:
            findings.append(_finding("Crypto-mining script", "In-browser miner reference found", "High"))
    except Exception as e:
        findings.append(_finding("Site unreachable", str(e)[:100], "Low"))
        details["status_code"] = None

    return _finalize("Website Scan", findings, details, "No significant threats found on this website.",
                     "Avoid entering credentials or downloading files from this site.",
                     "Website appears safe. Always stay vigilant.")
