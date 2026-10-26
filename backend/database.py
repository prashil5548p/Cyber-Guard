from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost:3306/cyberguard")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("analyst", "admin", name="user_role"), default="analyst")
    created_at = Column(DateTime, default=datetime.utcnow)


class SecurityEvent(Base):
    __tablename__ = "security_events"
    event_id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String(100))
    source = Column(String(200))
    event_data = Column(Text)
    alerts = relationship("ThreatAlert", back_populates="event")


class ThreatAlert(Base):
    __tablename__ = "threat_alerts"
    alert_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("security_events.event_id"))
    threat_type = Column(String(100))
    risk_score = Column(Float)
    severity = Column(Enum("Low", "Medium", "High", "Critical", name="severity_level"))
    status = Column(Enum("Open", "Investigating", "Resolved", name="alert_status"), default="Open")
    explanation = Column(Text)
    recommendation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    event = relationship("SecurityEvent", back_populates="alerts")
    incident_reports = relationship("IncidentReport", back_populates="alert")


class PhishingCheck(Base):
    __tablename__ = "phishing_checks"
    check_id = Column(Integer, primary_key=True, index=True)
    message_text = Column(Text)
    prediction = Column(String(50))
    confidence = Column(Float)
    reasons = Column(Text)
    checked_at = Column(DateTime, default=datetime.utcnow)


class IncidentReport(Base):
    __tablename__ = "incident_reports"
    report_id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("threat_alerts.alert_id"))
    analyst_notes = Column(Text)
    resolution = Column(String(255))
    resolved_at = Column(DateTime)
    alert = relationship("ThreatAlert", back_populates="incident_reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    audit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action = Column(String(255))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
