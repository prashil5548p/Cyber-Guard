-- CyberGuard AI Database Schema
-- MySQL 8.x

CREATE DATABASE IF NOT EXISTS cyberguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cyberguard;

CREATE TABLE IF NOT EXISTS users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role        ENUM('analyst','admin') DEFAULT 'analyst',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    event_id    INT AUTO_INCREMENT PRIMARY KEY,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type  VARCHAR(100),
    source      VARCHAR(200),
    event_data  TEXT
);

CREATE TABLE IF NOT EXISTS threat_alerts (
    alert_id        INT AUTO_INCREMENT PRIMARY KEY,
    event_id        INT,
    threat_type     VARCHAR(100),
    risk_score      FLOAT,
    severity        ENUM('Low','Medium','High','Critical'),
    status          ENUM('Open','Investigating','Resolved') DEFAULT 'Open',
    explanation     TEXT,
    recommendation  TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES security_events(event_id)
);

CREATE TABLE IF NOT EXISTS phishing_checks (
    check_id        INT AUTO_INCREMENT PRIMARY KEY,
    message_text    TEXT,
    prediction      VARCHAR(50),
    confidence      FLOAT,
    reasons         TEXT,
    checked_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_reports (
    report_id       INT AUTO_INCREMENT PRIMARY KEY,
    alert_id        INT,
    analyst_notes   TEXT,
    resolution      VARCHAR(255),
    resolved_at     DATETIME,
    FOREIGN KEY (alert_id) REFERENCES threat_alerts(alert_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT,
    action      VARCHAR(255),
    details     TEXT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Demo admin user (password: CyberGuard@2024)
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@cyberguard.ai', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAV/RCwHRdQX3e2K', 'admin');
