import {
  addDoc, collection, doc, getDocs, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';

export const COLLECTIONS = {
  users: 'users',
  securityEvents: 'securityEvents',
  threatAlerts: 'threatAlerts',
  phishingChecks: 'phishingChecks',
  incidentReports: 'incidentReports',
  auditLogs: 'auditLogs',
} as const;

export type Role = 'analyst' | 'admin';

/** Create the users/{uid} profile on first login (role is always 'analyst'). */
export async function ensureUserProfile(uid: string, name: string, email: string) {
  await setDoc(
    doc(db, COLLECTIONS.users, uid),
    { name, email, role: 'analyst', createdAt: serverTimestamp() },
    { merge: true },
  );
}

export function addSecurityEvent(data: { eventType: string; source: string; eventData: Record<string, unknown> }) {
  return addDoc(collection(db, COLLECTIONS.securityEvents), { ...data, timestamp: serverTimestamp() });
}

export function addThreatAlert(data: {
  eventId?: string; threatType: string; riskScore: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  explanation: string; recommendation: string;
}) {
  return addDoc(collection(db, COLLECTIONS.threatAlerts), {
    ...data, status: 'Open', createdAt: serverTimestamp(),
  });
}

export function updateAlertStatus(id: string, status: 'Open' | 'Investigating' | 'Resolved') {
  return updateDoc(doc(db, COLLECTIONS.threatAlerts, id), { status });
}

export function addPhishingCheck(uid: string, data: {
  messageText: string; prediction: string; confidence: number; reasons: string[];
}) {
  return addDoc(collection(db, COLLECTIONS.phishingChecks), { ...data, uid, checkedAt: serverTimestamp() });
}

export function addAuditLog(uid: string, action: string, details = '') {
  return addDoc(collection(db, COLLECTIONS.auditLogs), { uid, action, details, timestamp: serverTimestamp() });
}

/** Live subscription to latest alerts, optionally filtered by status. */
export function subscribeAlerts(
  cb: (alerts: Array<Record<string, any> & { id: string }>) => void,
  status?: string,
  max = 100,
) {
  const c: QueryConstraint[] = [];
  if (status) c.push(where('status', '==', status));
  c.push(orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(query(collection(db, COLLECTIONS.threatAlerts), ...c), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function getRecentEvents(max = 100) {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.securityEvents), orderBy('timestamp', 'desc'), limit(max)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
