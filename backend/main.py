from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
import firebase_admin
from firebase_admin import auth as firebase_auth
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import json
import random
import io
import csv
import os
from dotenv import load_dotenv

from database import get_db, create_tables, User, SecurityEvent, ThreatAlert, PhishingCheck, IncidentReport, AuditLog
from schemas import (
    UserCreate, UserLogin, TokenResponse, PhishingRequest, PhishingResponse,
    LoginEventRequest, NetworkEventRequest, AlertOut, AlertStatusUpdate,
    EventOut, DashboardStats, SimulateRequest
)
from ai_engine import get_phishing_detector, get_anomaly_detector, get_decision_agent
import scanners
import chatbot
from pydantic import BaseModel

load_dotenv()

# Firebase Authentication: only the project ID is needed to verify ID tokens.
# Set GOOGLE_APPLICATION_CREDENTIALS too if you need other Admin SDK features.
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
# Comma-separated emails that are always granted the admin role on sign-in
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "admin@cyberguard.ai").split(",") if e.strip()}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/me")

app = FastAPI(title="CyberGuard AI API", version="1.0.0", description="AI-Powered Cybersecurity Threat Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    try:
        create_tables()
        # Seed demo user
        db = next(get_db())
        existing = db.query(User).filter(User.email == "admin@cyberguard.ai").first()
        if not existing:
            demo_user = User(
                name="Admin User",
                email="admin@cyberguard.ai",
                password_hash=pwd_context.hash("CyberGuard@2024"),
                role="admin",
            )
            db.add(demo_user)
            db.commit()
    except Exception as e:
        print(f"Startup warning: {e}")


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Uses Google's public certs; needs only the project ID, no service account.
        decoded = google_id_token.verify_firebase_token(
            token, google_requests.Request(), audience=FIREBASE_PROJECT_ID
        )
        if not decoded:
            raise ValueError("Invalid token")
    except Exception as e:
        print(f"Token verification failed: {type(e).__name__}: {e}")
        raise credentials_exception
    email = decoded.get("email")
    if not email:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        # First sign-in with Firebase: create a local profile (analyst unless allow-listed as admin)
        user = User(
            name=decoded.get("name") or email.split("@")[0],
            email=email,
            password_hash="firebase-managed",
            role="admin" if email.lower() in ADMIN_EMAILS else "analyst",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_action(db, user.user_id, "USER_REGISTERED", f"New user: {user.email}")
    elif email.lower() in ADMIN_EMAILS and user.role != "admin":
        user.role = "admin"
        db.commit()
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


def record_scan(db: Session, user: User, event_type: str, source: str, result: Dict[str, Any]) -> Optional[int]:
    """Persist a scan as an event; raise an alert when the risk is Medium or above."""
    event = SecurityEvent(
        event_type=event_type,
        source=f"{user.email}:{source}"[:200],
        event_data=json.dumps({"risk_score": result["risk_score"], "summary": result["summary"], "target": source}),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    alert_id = None
    if result["risk_score"] >= 40:
        alert_id = save_alert(db, event.event_id, result).alert_id
    log_action(db, user.user_id, event_type.upper(), f"{source} → {result['severity']} ({result['risk_score']})")
    return alert_id


def log_action(db: Session, user_id: Optional[int], action: str, details: str = ""):
    entry = AuditLog(user_id=user_id, action=action, details=details)
    db.add(entry)
    db.commit()


def save_alert(db: Session, event_id: int, analysis: Dict[str, Any]) -> ThreatAlert:
    alert = ThreatAlert(
        event_id=event_id,
        threat_type=analysis.get("threat_type", "Unknown"),
        risk_score=analysis.get("risk_score", 0),
        severity=analysis.get("severity", "Low"),
        explanation=analysis.get("explanation", ""),
        recommendation=analysis.get("recommendation", ""),
        status="Open",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


# ── Auth Routes ───────────────────────────────────────────────────────────────

# Registration and login are handled by Firebase Authentication on the client.
# /api/auth/me creates the local profile on first call.
@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"user_id": current_user.user_id, "name": current_user.name, "email": current_user.email, "role": current_user.role}


# ── Phishing Detection ────────────────────────────────────────────────────────

@app.post("/api/phishing/check")
def check_phishing(req: PhishingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = get_decision_agent()
    analysis = agent.analyze_event("phishing_check", {"message": req.message})

    # Save phishing check
    check = PhishingCheck(
        message_text=req.message[:500],
        prediction=analysis["details"].get("prediction", "Unknown"),
        confidence=analysis["details"].get("confidence", 0),
        reasons=json.dumps(analysis["details"].get("reasons", [])),
    )
    db.add(check)

    # Save event + alert
    event = SecurityEvent(
        event_type="phishing_check",
        source=f"user:{current_user.email}",
        event_data=json.dumps({"message_preview": req.message[:100]}),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    alert = save_alert(db, event.event_id, analysis)
    log_action(db, current_user.user_id, "PHISHING_CHECK", f"Result: {analysis['threat_type']}")
    return {**analysis, "alert_id": alert.alert_id, "check_id": check.check_id}


# ── Login Anomaly Detection ───────────────────────────────────────────────────

@app.post("/api/anomaly/login")
def check_login_anomaly(req: LoginEventRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = get_decision_agent()
    hour = req.hour if req.hour is not None else datetime.utcnow().hour
    analysis = agent.analyze_event("login_anomaly", {
        "hour": hour,
        "failed_attempts": req.failed_attempts,
        "login_frequency": req.login_frequency,
        "unique_ips": req.unique_ips,
        "session_duration": req.session_duration,
    })

    event = SecurityEvent(
        event_type="login_anomaly",
        source=req.source_ip,
        event_data=json.dumps({"username": req.username, "source_ip": req.source_ip, "failed_attempts": req.failed_attempts}),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    alert = save_alert(db, event.event_id, analysis)
    log_action(db, current_user.user_id, "LOGIN_ANOMALY_CHECK", f"IP:{req.source_ip} Result:{analysis['threat_type']}")
    return {**analysis, "alert_id": alert.alert_id}


# ── Network Event Detection ───────────────────────────────────────────────────

@app.post("/api/anomaly/network")
def check_network_event(req: NetworkEventRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = get_decision_agent()
    analysis = agent.analyze_event("network_event", {
        "port": req.port,
        "connections_per_minute": req.connections_per_minute,
    })

    event = SecurityEvent(
        event_type="network_event",
        source=req.source_ip,
        event_data=json.dumps({"src": req.source_ip, "dst": req.destination_ip, "port": req.port, "proto": req.protocol}),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    alert = save_alert(db, event.event_id, analysis)
    return {**analysis, "alert_id": alert.alert_id}


# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=List[AlertOut])
def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ThreatAlert)
    if severity:
        query = query.filter(ThreatAlert.severity == severity)
    if status:
        query = query.filter(ThreatAlert.status == status)
    return query.order_by(ThreatAlert.created_at.desc()).offset(skip).limit(limit).all()


@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: int, update: AlertStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(ThreatAlert).filter(ThreatAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = update.status.value
    if update.analyst_notes and alert.alert_id:
        report = IncidentReport(
            alert_id=alert.alert_id,
            analyst_notes=update.analyst_notes,
            resolution=update.status.value,
            resolved_at=datetime.utcnow() if update.status.value == "Resolved" else None,
        )
        db.add(report)
    db.commit()
    log_action(db, current_user.user_id, "ALERT_UPDATED", f"Alert {alert_id} → {update.status.value}")
    return {"message": "Alert updated", "alert_id": alert_id, "status": update.status.value}


# ── Events ────────────────────────────────────────────────────────────────────

@app.get("/api/events", response_model=List[EventOut])
def get_events(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).offset(skip).limit(limit).all()


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(ThreatAlert).all()
    events = db.query(SecurityEvent).all()
    phishing = db.query(PhishingCheck).all()

    return DashboardStats(
        total_events=len(events),
        total_alerts=len(alerts),
        critical_alerts=sum(1 for a in alerts if a.severity == "Critical"),
        high_alerts=sum(1 for a in alerts if a.severity == "High"),
        medium_alerts=sum(1 for a in alerts if a.severity == "Medium"),
        low_alerts=sum(1 for a in alerts if a.severity == "Low"),
        open_alerts=sum(1 for a in alerts if a.status == "Open"),
        resolved_alerts=sum(1 for a in alerts if a.status == "Resolved"),
        phishing_detected=sum(1 for p in phishing if p.prediction == "Phishing"),
        anomalies_detected=sum(1 for a in alerts if "login" in (a.threat_type or "").lower() or "network" in (a.threat_type or "").lower()),
    )


@app.get("/api/dashboard/chart-data")
def get_chart_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(ThreatAlert).order_by(ThreatAlert.created_at.asc()).all()
    daily: dict = {}
    for a in alerts:
        day = a.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"date": day, "Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        daily[day][a.severity] = daily[day].get(a.severity, 0) + 1
    return {"daily_alerts": list(daily.values())[-14:], "severity_distribution": [
        {"name": "Critical", "value": sum(1 for a in alerts if a.severity == "Critical"), "color": "#ff3b4e"},
        {"name": "High", "value": sum(1 for a in alerts if a.severity == "High"), "color": "#ff8c00"},
        {"name": "Medium", "value": sum(1 for a in alerts if a.severity == "Medium"), "color": "#f5c400"},
        {"name": "Low", "value": sum(1 for a in alerts if a.severity == "Low"), "color": "#00c48c"},
    ]}


# ── Simulation ────────────────────────────────────────────────────────────────

SAMPLE_IPS = ["192.168.1.101", "10.0.0.55", "172.16.0.23", "203.0.113.45", "198.51.100.7"]
SAMPLE_MESSAGES = [
    "Your account has been compromised! Click http://phish.xyz/verify to reset.",
    "Meeting at 3 PM tomorrow in the conference room.",
    "URGENT: Your bank account requires immediate verification at http://bank-secure.tk",
    "Please review the attached quarterly report before Friday.",
    "Congratulations! You've won $5000. Claim at http://prize.ru/win now!",
    "Hi team, reminder about the team-building event next week.",
]


@app.post("/api/simulate/events")
def simulate_events(req: SimulateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    agent = get_decision_agent()
    generated = []

    for _ in range(min(req.count, 20)):
        event_type = random.choice(["phishing_check", "login_anomaly", "network_event"])

        if event_type == "phishing_check":
            msg = random.choice(SAMPLE_MESSAGES)
            analysis = agent.analyze_event("phishing_check", {"message": msg})
            event = SecurityEvent(event_type="phishing_check", source="simulation", event_data=json.dumps({"message_preview": msg[:80]}))
        elif event_type == "login_anomaly":
            data = {
                "hour": random.choice([2, 3, 9, 10, 14, 23]),
                "failed_attempts": random.choice([0, 0, 1, 3, 7, 12]),
                "login_frequency": random.choice([1, 2, 8, 15]),
                "unique_ips": random.choice([1, 1, 2, 4]),
                "session_duration": random.randint(5, 45),
            }
            analysis = agent.analyze_event("login_anomaly", data)
            event = SecurityEvent(event_type="login_anomaly", source=random.choice(SAMPLE_IPS), event_data=json.dumps(data))
        else:
            data = {"port": random.choice([80, 443, 22, 4444, 8080, 1337, 3389]), "connections_per_minute": random.randint(2, 50)}
            analysis = agent.analyze_event("network_event", data)
            event = SecurityEvent(event_type="network_event", source=random.choice(SAMPLE_IPS), event_data=json.dumps(data))

        db.add(event)
        db.commit()
        db.refresh(event)
        alert = save_alert(db, event.event_id, analysis)
        generated.append({"event_id": event.event_id, "alert_id": alert.alert_id, "severity": analysis["severity"]})

    log_action(db, current_user.user_id, "SIMULATION_RUN", f"Generated {len(generated)} events")
    return {"message": f"Generated {len(generated)} simulated events", "events": generated}


# ── Scanners ──────────────────────────────────────────────────────────────────

class IPScanRequest(BaseModel):
    ip: str


class WebsiteScanRequest(BaseModel):
    url: str


class AppScanRequest(BaseModel):
    app_name: Optional[str] = None


class ChatRequest(BaseModel):
    message: str


class RoleUpdate(BaseModel):
    role: str


@app.post("/api/scan/pc")
def scan_pc_route(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    result = scanners.scan_pc()
    result["alert_id"] = record_scan(db, admin, "pc_scan", result["details"]["hostname"], result)
    return result


@app.post("/api/scan/apps")
def scan_apps_route(req: Optional[AppScanRequest] = None, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    target = (req.app_name or "").strip() if req else ""
    result = scanners.scan_apps(target or None)
    result["alert_id"] = record_scan(db, admin, "app_scan", target or "running-processes", result)
    return result


@app.post("/api/scan/ip")
def scan_ip_route(req: IPScanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        result = scanners.scan_ip(req.ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result["alert_id"] = record_scan(db, current_user, "ip_scan", req.ip.strip(), result)
    return result


@app.post("/api/scan/website")
def scan_website_route(req: WebsiteScanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        result = scanners.scan_website(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result["alert_id"] = record_scan(db, current_user, "website_scan", req.url.strip(), result)
    return result


@app.post("/api/scan/file")
async def scan_file_route(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")
    result = scanners.scan_file(file.filename or "unknown", data)
    result["alert_id"] = record_scan(db, current_user, "file_scan", file.filename or "unknown", result)
    return result


# ── Chatbot ───────────────────────────────────────────────────────────────────

@app.post("/api/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return chatbot.reply(req.message[:1000], db, current_user)


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.get("/api/admin/users")
def admin_list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [{"user_id": u.user_id, "name": u.name, "email": u.email, "role": u.role,
             "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]


@app.patch("/api/admin/users/{user_id}/role")
def admin_set_role(user_id: int, body: RoleUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if body.role not in ("analyst", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'analyst' or 'admin'")
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.user_id == admin.user_id and body.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot demote yourself")
    target.role = body.role
    db.commit()
    log_action(db, admin.user_id, "ROLE_CHANGED", f"{target.email} → {body.role}")
    return {"user_id": target.user_id, "role": target.role}


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    email = target.email
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    db.delete(target)
    db.commit()
    log_action(db, admin.user_id, "USER_DELETED", email)
    return {"message": "User removed"}


@app.get("/api/admin/audit-logs")
def admin_audit_logs(limit: int = 100, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(min(limit, 500)).all()
    names = {u.user_id: u.email for u in db.query(User).all()}
    return [{"audit_id": l.audit_id, "user": names.get(l.user_id, "system"), "action": l.action,
             "details": l.details, "timestamp": l.timestamp.isoformat()} for l in logs]


@app.get("/api/admin/overview")
def admin_overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    users = db.query(User).all()
    return {
        "users": len(users),
        "admins": sum(1 for u in users if u.role == "admin"),
        "alerts": db.query(ThreatAlert).count(),
        "events": db.query(SecurityEvent).count(),
        "scans": db.query(SecurityEvent).filter(SecurityEvent.event_type.like("%_scan")).count(),
        "audit_entries": db.query(AuditLog).count(),
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CyberGuard AI", "version": "1.0.0"}
