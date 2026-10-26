from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    analyst = "analyst"
    admin = "admin"


class SeverityLevel(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class AlertStatus(str, Enum):
    Open = "Open"
    Investigating = "Investigating"
    Resolved = "Resolved"


# ── Auth ──────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.analyst


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]


# ── Phishing ──────────────────────────────────
class PhishingRequest(BaseModel):
    message: str


class PhishingResponse(BaseModel):
    prediction: str
    confidence: float
    risk_score: float
    reasons: List[str]
    urls_found: List[str]
    suspicious_urls: List[str]
    keyword_count: int
    severity: str
    recommendation: str


# ── Login Anomaly ─────────────────────────────
class LoginEventRequest(BaseModel):
    source_ip: str
    username: str
    hour: Optional[int] = None
    failed_attempts: int = 0
    login_frequency: int = 1
    unique_ips: int = 1
    session_duration: int = 20


class NetworkEventRequest(BaseModel):
    source_ip: str
    destination_ip: str
    port: int
    protocol: str
    connections_per_minute: int = 10


# ── Alerts ────────────────────────────────────
class AlertOut(BaseModel):
    alert_id: int
    event_id: Optional[int]
    threat_type: str
    risk_score: float
    severity: str
    status: str
    explanation: Optional[str]
    recommendation: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: AlertStatus
    analyst_notes: Optional[str] = None


# ── Events ────────────────────────────────────
class EventOut(BaseModel):
    event_id: int
    timestamp: datetime
    event_type: str
    source: str
    event_data: Optional[str]

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────
class DashboardStats(BaseModel):
    total_events: int
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    open_alerts: int
    resolved_alerts: int
    phishing_detected: int
    anomalies_detected: int


# ── Simulation ───────────────────────────────
class SimulateRequest(BaseModel):
    count: int = 10
