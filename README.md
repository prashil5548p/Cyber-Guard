# 🛡️ CyberGuard AI — Cybersecurity Threat Detection Agent

> **AI-Powered Cybersecurity Threat Detection and Response System**  
> Computer Engineering Diploma/Degree Project

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20MySQL%20%7C%20Scikit--learn-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Project Overview

CyberGuard AI is a full-stack cybersecurity application that combines:
- **AI/ML detection** (TF-IDF, Logistic Regression, Isolation Forest)
- **Security Scanners Suite**:
  - 💻 **PC Scanning**: Hardware consumption, listening sockets, Windows Firewall profiles, and machine uptime
  - 🧩 **Apps Scanning**: Process threat inspector, LOLBINs/obfuscated scripts, temporary/untrusted execution paths
  - 📡 **IP Scanning**: Threat classification, port exposure, dangerous service detection, live socket connections
  - 📁 **File Scanning**: Shannon entropy analysis, byte magic verification, double extensions, embedded scripts & EICAR test signature
  - 🌐 **Website Scanning**: HTTPS/TLS certificate audit, security headers (HSTS/CSP/XFO), phishing heuristics, crypto miners
- **AI Security Copilot**: Real-time conversational security assistant for threat triage, alert explanation, and posture summaries
- **Admin Control Center**: Role-Based Access Control (Analyst vs. Admin), role promotions/demotions, user deletion, and persistent security audit trail
- **FastAPI backend** with Firebase Authentication
- **React.js dashboard** with real-time threat visualization and SQLite/MySQL persistence

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard │ Phishing │ Anomaly │ Alerts │ Events   │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (Axios)
┌──────────────────────▼──────────────────────────────┐
│                 FastAPI Backend                       │
│  Auth │ Phishing API │ Anomaly API │ Alerts API     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌────▼──────────┐
│  MySQL DB    │ │ ML Models │ │ AI Agent      │
│  - users     │ │ TF-IDF+LR │ │ Decision      │
│  - events    │ │ IsoForest │ │ Engine        │
│  - alerts    │ │ RF Hybrid │ │ Risk Scoring  │
└──────────────┘ └───────────┘ └───────────────┘
```

---

## 🤖 AI Modules

| Module | Algorithm | Purpose |
|--------|-----------|---------|
| Phishing Detector | TF-IDF + Logistic Regression | Classify messages as phishing/legitimate |
| Anomaly Detector | Isolation Forest + Rules | Detect unusual login/network patterns |
| Decision Agent | Rule-based + ML ensemble | Combine findings, score risk, recommend actions |

---

## 🗂️ Project Structure

```
AI Agent/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── ai_engine.py     # ML models + Decision Agent
│   ├── database.py      # SQLAlchemy models
│   ├── schemas.py       # Pydantic request/response models
│   ├── requirements.txt
│   └── .env             # Configuration
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Alerts, Phishing, Anomaly, Events
│   │   ├── components/  # Sidebar, Topbar
│   │   ├── context/     # AuthContext
│   │   ├── api.ts       # Axios API client
│   │   └── index.css    # Design system
│   └── package.json
└── database/
    └── schema.sql       # MySQL schema
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.x

### 1. Database Setup
```sql
-- Run in MySQL:
CREATE DATABASE cyberguard;
-- Then run: mysql -u root -p cyberguard < database/schema.sql
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Edit .env with your MySQL credentials
# DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/cyberguard

python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 4. Demo Login
- **Email:** `admin@cyberguard.ai`
- **Password:** `CyberGuard@2024`

---

## 📊 Features

### ✅ Basic Version (Implemented)
- [x] JWT login + registration with role-based access
- [x] Security dashboard with real-time stats + charts
- [x] Phishing message analyzer (with URL detection)
- [x] Login anomaly detection (Isolation Forest)
- [x] Network traffic anomaly detection
- [x] AI decision agent with severity scoring
- [x] Alert management (Open/Investigating/Resolved)
- [x] Security event log viewer
- [x] Event simulation for demo

### 🔮 Advanced Version (Future)
- [ ] Streaming event processing
- [ ] MITRE ATT&CK mapping
- [ ] Explainable AI (SHAP/LIME)
- [ ] Threat intelligence API integration
- [ ] Analyst feedback loop for model improvement

---

## 🔒 Security Notes

- All passwords are bcrypt-hashed
- JWT tokens expire after 60 minutes
- API endpoints require authentication
- This is a **decision-support prototype** — no automatic blocking of accounts
- All consequential actions require human approval

---

## 📈 Evaluation Metrics

The system tracks:
- Detection accuracy (precision/recall)
- False positive rate
- Alert severity distribution
- Response time per event

---

## 📚 Datasets Used (for Training)

- **Phishing:** Custom labeled dataset + PhishTank patterns
- **Anomaly:** Synthetic normal behavior (Gaussian distributions)
- **Reference:** CIC-IDS2017 for feature engineering inspiration

---

## 👨‍💻 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (Custom Design System) |
| Charts | Recharts |
| Backend | Python 3.10 + FastAPI |
| Database | MySQL 8.x + SQLAlchemy |
| ML | Scikit-learn (TF-IDF, LR, Isolation Forest) |
| Auth | JWT + bcrypt |
| HTTP Client | Axios |

---

*Built as a Computer Engineering Diploma Project — AI-Powered Cybersecurity*
