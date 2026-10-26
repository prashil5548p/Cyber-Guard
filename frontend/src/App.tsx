import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChatWidget from './components/ChatWidget';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import PhishingPage from './pages/PhishingPage';
import AnomalyPage from './pages/AnomalyPage';
import EventsPage from './pages/EventsPage';
import ScannersPage from './pages/ScannersPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import PlaybookPage from './pages/PlaybookPage';

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
        <div style={{ color: 'var(--text-secondary)' }}>Loading CyberGuard AI...</div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <div className="bg-grid" />
      <Sidebar />
      <div className="main-content">
        <Topbar />
        {children}
        <ChatWidget />
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/alerts" element={<ProtectedLayout><AlertsPage /></ProtectedLayout>} />
      <Route path="/scanners" element={<ProtectedLayout><ScannersPage /></ProtectedLayout>} />
      <Route path="/phishing" element={<ProtectedLayout><PhishingPage /></ProtectedLayout>} />
      <Route path="/anomaly" element={<ProtectedLayout><AnomalyPage /></ProtectedLayout>} />
      <Route path="/playbook" element={<ProtectedLayout><PlaybookPage /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
      <Route path="/events" element={<ProtectedLayout><EventsPage /></ProtectedLayout>} />
      <Route path="/admin" element={<ProtectedLayout><AdminPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: 'var(--low)', secondary: 'var(--bg-card)' } },
            error: { iconTheme: { primary: 'var(--critical)', secondary: 'var(--bg-card)' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
