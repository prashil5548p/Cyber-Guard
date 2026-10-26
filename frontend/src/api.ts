import axios from 'axios';
import { firebaseAuth } from './firebase';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const fbUser = firebaseAuth.currentUser;
  if (fbUser) {
    const token = await fbUser.getIdToken(); // auto-refreshes when expired
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && firebaseAuth.currentUser) {
      firebaseAuth.signOut();
    }
    return Promise.reject(err);
  }
);

// Auth (login/register are handled by Firebase on the client)
export const getMe = () => api.get('/auth/me');

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getChartData = () => api.get('/dashboard/chart-data');

// Alerts
export const getAlerts = (params?: { severity?: string; status?: string; skip?: number; limit?: number }) =>
  api.get('/alerts', { params });
export const updateAlert = (alertId: number, data: { status: string; analyst_notes?: string }) =>
  api.patch(`/alerts/${alertId}`, data);

// Events
export const getEvents = (params?: { skip?: number; limit?: number }) =>
  api.get('/events', { params });

// AI Detection
export const checkPhishing = (message: string) =>
  api.post('/phishing/check', { message });
export const checkLoginAnomaly = (data: {
  source_ip: string; username: string; hour?: number;
  failed_attempts: number; login_frequency: number; unique_ips: number; session_duration: number;
}) => api.post('/anomaly/login', data);
export const checkNetworkEvent = (data: {
  source_ip: string; destination_ip: string; port: number; protocol: string; connections_per_minute: number;
}) => api.post('/anomaly/network', data);

// Simulation
export const simulateEvents = (count: number) =>
  api.post('/simulate/events', { count });

// Scanners
export const scanPC = () => api.post('/scan/pc');
export const scanApps = (appName?: string) => api.post('/scan/apps', { app_name: appName || null });
export const scanIP = (ip: string) => api.post('/scan/ip', { ip });
export const scanWebsite = (url: string) => api.post('/scan/website', { url });
export const scanFile = (formData: FormData) =>
  api.post('/scan/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// AI Chatbot
export const sendChatMessage = (message: string) =>
  api.post('/chat', { message });

// Admin
export const getAdminUsers = () => api.get('/admin/users');
export const updateUserRole = (userId: number, role: string) =>
  api.patch(`/admin/users/${userId}/role`, { role });
export const deleteUser = (userId: number) =>
  api.delete(`/admin/users/${userId}`);
export const getAdminAuditLogs = (limit?: number) =>
  api.get('/admin/audit-logs', { params: { limit } });
export const getAdminOverview = () => api.get('/admin/overview');

export default api;
