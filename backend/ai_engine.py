import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple


# ─────────────────────────────────────────────
#  PHISHING DETECTOR  (TF-IDF + Logistic Regression)
# ─────────────────────────────────────────────

PHISHING_TRAINING_DATA = [
    ("Your account has been suspended! Click here immediately to verify: http://bit.ly/secure-login-now", 1),
    ("URGENT: Confirm your PayPal account or it will be terminated. Login at http://paypal-secure.xyz", 1),
    ("You have won $1,000,000! Claim your prize now by clicking this link: http://prize-claim.ru/win", 1),
    ("Dear Customer, your bank account requires immediate verification. Click: http://bankofamerica-verify.com", 1),
    ("ALERT: Unusual activity detected on your account. Verify now: http://amazon-security-alert.tk", 1),
    ("Your password will expire in 24 hours! Update it here: http://microsoft-update.xyz/password", 1),
    ("Congratulations! You've been selected for a free iPhone. Claim now: http://free-iphone-offer.ru", 1),
    ("Your Netflix subscription has expired. Re-activate now: http://netflix-billing.xyz", 1),
    ("IRS TAX REFUND: You are eligible for a $2400 refund. Submit your details at http://irs-refund.tk", 1),
    ("Warning: Your computer has a virus! Call us now at 1-800-FAKE or visit http://pcfix-now.xyz", 1),
    ("Dear user, click here to reset your Google password immediately: http://google-reset.pw", 1),
    ("Your Apple ID has been locked. Verify at http://apple-id-verify.net immediately to avoid suspension", 1),
    ("Hi team, please find attached the Q3 report as discussed in yesterday's meeting.", 0),
    ("Your order #12345 has been shipped! Track it at fedex.com/track", 0),
    ("Meeting reminder: Project sync at 3 PM in Conference Room B", 0),
    ("Thank you for your purchase. Your receipt is attached.", 0),
    ("Please review the updated project documentation at our internal SharePoint.", 0),
    ("Happy birthday! Hope you have a wonderful day.", 0),
    ("Your monthly bank statement is now available. Log in at chase.com to view it.", 0),
    ("The weekly newsletter from your subscribed service is here.", 0),
    ("Reminder: Your dentist appointment is tomorrow at 10 AM.", 0),
    ("Team lunch is scheduled for Friday. Please RSVP by Thursday.", 0),
    ("Your library book is due back on November 5th.", 0),
    ("Flight confirmation: Your booking AA123 is confirmed for Nov 15.", 0),
]

PHISHING_KEYWORDS = [
    "urgent", "verify", "suspended", "click here", "immediately", "winner",
    "congratulations", "free", "account locked", "unusual activity", "confirm",
    "expire", "limited time", "act now", "security alert", "password", "claim",
    "prize", "selected", "eligible", "refund", "warning", "virus"
]

SUSPICIOUS_DOMAINS = [
    ".xyz", ".tk", ".pw", ".ru", ".ml", ".ga", ".cf", "bit.ly",
    "-secure", "-verify", "-alert", "-update", "-billing", "secure-login",
]


class PhishingDetector:
    def __init__(self):
        texts, labels = zip(*PHISHING_TRAINING_DATA)
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, stop_words="english")),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ])
        self.pipeline.fit(texts, labels)

    def _extract_urls(self, text: str) -> List[str]:
        return re.findall(r"http[s]?://\S+", text)

    def _check_suspicious_url(self, url: str) -> bool:
        return any(d in url.lower() for d in SUSPICIOUS_DOMAINS)

    def _count_keywords(self, text: str) -> int:
        text_lower = text.lower()
        return sum(1 for kw in PHISHING_KEYWORDS if kw in text_lower)

    def predict(self, message: str) -> Dict[str, Any]:
        proba = self.pipeline.predict_proba([message])[0]
        phishing_prob = float(proba[1])
        keyword_count = self._count_keywords(message)
        urls = self._extract_urls(message)
        suspicious_urls = [u for u in urls if self._check_suspicious_url(u)]

        # Boost score for suspicious signals
        if suspicious_urls:
            phishing_prob = min(1.0, phishing_prob + 0.25)
        if keyword_count >= 3:
            phishing_prob = min(1.0, phishing_prob + 0.1)

        prediction = "Phishing" if phishing_prob > 0.5 else "Legitimate"
        reasons = []
        if suspicious_urls:
            reasons.append(f"Contains {len(suspicious_urls)} suspicious URL(s): {', '.join(suspicious_urls[:2])}")
        if keyword_count > 0:
            reasons.append(f"Found {keyword_count} phishing keyword(s) like urgency/threat language")
        if "!" in message and message.count("!") >= 2:
            reasons.append("Excessive use of exclamation marks (urgency manipulation)")
        if re.search(r"\$[\d,]+", message):
            reasons.append("Contains financial lure (money amount mentioned)")
        if not reasons and prediction == "Legitimate":
            reasons.append("No suspicious patterns detected in message content or links")

        return {
            "prediction": prediction,
            "confidence": round(phishing_prob if prediction == "Phishing" else 1 - phishing_prob, 3),
            "risk_score": round(phishing_prob * 100, 1),
            "reasons": reasons,
            "urls_found": urls,
            "suspicious_urls": suspicious_urls,
            "keyword_count": keyword_count,
        }


# ─────────────────────────────────────────────
#  ANOMALY DETECTOR  (Isolation Forest)
# ─────────────────────────────────────────────

def _generate_normal_login_data(n=300) -> pd.DataFrame:
    np.random.seed(42)
    return pd.DataFrame({
        "hour": np.random.choice(range(8, 19), n),          # 8 AM – 6 PM
        "failed_attempts": np.random.choice([0, 1, 2], n, p=[0.8, 0.15, 0.05]),
        "login_frequency": np.random.randint(1, 5, n),
        "unique_ips": np.random.choice([1, 2], n, p=[0.9, 0.1]),
        "session_duration": np.random.randint(5, 60, n),
    })


class AnomalyDetector:
    def __init__(self):
        normal_data = _generate_normal_login_data()
        self.features = ["hour", "failed_attempts", "login_frequency", "unique_ips", "session_duration"]
        self.scaler = StandardScaler()
        X = self.scaler.fit_transform(normal_data[self.features])
        self.model = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
        self.model.fit(X)

    def score_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        hour = event.get("hour", datetime.utcnow().hour)
        failed_attempts = event.get("failed_attempts", 0)
        login_frequency = event.get("login_frequency", 1)
        unique_ips = event.get("unique_ips", 1)
        session_duration = event.get("session_duration", 20)

        X = self.scaler.transform([[hour, failed_attempts, login_frequency, unique_ips, session_duration]])
        score = self.model.decision_function(X)[0]
        is_anomaly = self.model.predict(X)[0] == -1

        # Convert isolation forest score to 0-100 risk score
        risk_score = max(0, min(100, ((-score + 0.2) / 0.6) * 100))

        # Rule-based boosts
        flags = []
        if failed_attempts >= 5:
            risk_score = min(100, risk_score + 30)
            flags.append(f"{failed_attempts} failed login attempts detected")
        if hour < 6 or hour > 22:
            risk_score = min(100, risk_score + 20)
            flags.append(f"Login at unusual hour: {hour:02d}:00")
        if login_frequency > 10:
            risk_score = min(100, risk_score + 15)
            flags.append(f"Abnormally high login frequency: {login_frequency} attempts")
        if unique_ips > 3:
            risk_score = min(100, risk_score + 15)
            flags.append(f"Multiple source IPs: {unique_ips} distinct IPs")

        severity = (
            "Critical" if risk_score >= 80 else
            "High" if risk_score >= 60 else
            "Medium" if risk_score >= 40 else
            "Low"
        )

        return {
            "is_anomaly": is_anomaly or risk_score > 40,
            "risk_score": round(risk_score, 1),
            "severity": severity,
            "flags": flags,
            "isolation_score": round(float(score), 4),
        }


# ─────────────────────────────────────────────
#  AI DECISION-SUPPORT AGENT
# ─────────────────────────────────────────────

RECOMMENDATIONS = {
    "Critical": [
        "Immediately block the source IP and suspend the affected account",
        "Notify the security team and initiate incident response protocol",
        "Capture forensic logs for full investigation",
        "Force password reset for all related accounts",
        "Enable multi-factor authentication if not already active",
    ],
    "High": [
        "Temporarily lock the account pending investigation",
        "Alert the account owner via a secondary contact method",
        "Review recent activity logs for the past 24 hours",
        "Check for lateral movement to other systems",
    ],
    "Medium": [
        "Flag the account for enhanced monitoring",
        "Verify the identity of the account owner",
        "Review and tighten access control policies",
        "Document the incident for trend analysis",
    ],
    "Low": [
        "Log the event and continue monitoring",
        "Educate the user about security best practices",
        "Review if the pattern repeats within the next 24 hours",
    ],
}


class DecisionAgent:
    def __init__(self):
        self.phishing_detector = PhishingDetector()
        self.anomaly_detector = AnomalyDetector()

    def analyze_event(self, event_type: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        result = {"event_type": event_type, "timestamp": datetime.utcnow().isoformat()}

        if event_type == "phishing_check":
            phishing = self.phishing_detector.predict(event_data.get("message", ""))
            severity = (
                "Critical" if phishing["risk_score"] >= 80 else
                "High" if phishing["risk_score"] >= 60 else
                "Medium" if phishing["risk_score"] >= 40 else
                "Low"
            )
            explanation = f"Message classified as {phishing['prediction']} with {phishing['confidence']*100:.0f}% confidence. "
            if phishing["reasons"]:
                explanation += "Key indicators: " + "; ".join(phishing["reasons"])
            result.update({
                "threat_type": "Phishing Attempt" if phishing["prediction"] == "Phishing" else "Clean Message",
                "risk_score": phishing["risk_score"],
                "severity": severity,
                "explanation": explanation,
                "recommendation": "; ".join(RECOMMENDATIONS[severity][:3]),
                "details": phishing,
            })

        elif event_type == "login_anomaly":
            anomaly = self.anomaly_detector.score_event(event_data)
            explanation = f"Login event scored {anomaly['risk_score']:.0f}/100 risk. "
            if anomaly["flags"]:
                explanation += "Anomalies detected: " + "; ".join(anomaly["flags"])
            else:
                explanation += "No significant anomalies detected."
            result.update({
                "threat_type": "Suspicious Login" if anomaly["is_anomaly"] else "Normal Login",
                "risk_score": anomaly["risk_score"],
                "severity": anomaly["severity"],
                "explanation": explanation,
                "recommendation": "; ".join(RECOMMENDATIONS[anomaly["severity"]][:3]),
                "details": anomaly,
            })

        elif event_type == "network_event":
            # Rule-based + anomaly hybrid
            port = event_data.get("port", 80)
            connections = event_data.get("connections_per_minute", 10)
            is_known_bad_port = port in [4444, 1337, 31337, 6666, 9999, 23, 4321]
            risk_score = min(100, connections * 2 + (50 if is_known_bad_port else 0))
            severity = (
                "Critical" if risk_score >= 80 else
                "High" if risk_score >= 60 else
                "Medium" if risk_score >= 40 else
                "Low"
            )
            flags = []
            if is_known_bad_port:
                flags.append(f"Known malicious/backdoor port {port}")
            if connections > 30:
                flags.append(f"High connection rate: {connections}/min")
            result.update({
                "threat_type": "Network Intrusion Attempt" if risk_score > 40 else "Normal Traffic",
                "risk_score": round(risk_score, 1),
                "severity": severity,
                "explanation": f"Network traffic analysis scored {risk_score:.0f}/100. " + ("; ".join(flags) if flags else "Traffic appears normal."),
                "recommendation": "; ".join(RECOMMENDATIONS[severity][:3]),
                "details": {"port": port, "connections_per_minute": connections, "flags": flags},
            })

        else:
            result.update({
                "threat_type": "Unknown",
                "risk_score": 0,
                "severity": "Low",
                "explanation": "Event type not recognized by the agent.",
                "recommendation": RECOMMENDATIONS["Low"][0],
                "details": {},
            })

        return result


# Singleton instances
_phishing_detector = None
_anomaly_detector = None
_decision_agent = None


def get_phishing_detector() -> PhishingDetector:
    global _phishing_detector
    if _phishing_detector is None:
        _phishing_detector = PhishingDetector()
    return _phishing_detector


def get_anomaly_detector() -> AnomalyDetector:
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
    return _anomaly_detector


def get_decision_agent() -> DecisionAgent:
    global _decision_agent
    if _decision_agent is None:
        _decision_agent = DecisionAgent()
    return _decision_agent
