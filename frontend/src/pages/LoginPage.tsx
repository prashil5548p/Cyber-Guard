import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Shield, Eye, EyeOff, Lock, Mail, User
} from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'analyst' });
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google');
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        toast.error(
          err.code === 'auth/operation-not-allowed'
            ? 'Enable Google sign-in in Firebase Console > Authentication'
            : err.response?.data?.detail || err.message || 'Google sign-in failed'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        await register({ name: form.name, email: form.email, password: form.password, role: form.role });
        toast.success('Account created! Please log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      const code: string | undefined = err.code;
      const msg =
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Invalid email or password'
          : code === 'auth/email-already-in-use'
          ? 'Email already registered'
          : code === 'auth/weak-password'
          ? 'Password must be at least 6 characters'
          : err.response?.data?.detail || err.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="bg-grid" />

      {/* Glow orbs */}
      <div style={{
        position: 'fixed', top: '10%', left: '20%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '20%', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-logo">
          <div className="logo-icon" style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(0,212,255,0.4)',
          }}>
            <Shield size={26} color="#000" />
          </div>
          <div className="auth-title">
            Cyber<span style={{ color: 'var(--cyan)' }}>Guard</span> AI
          </div>
          <div className="auth-subtitle">
            {isLogin ? 'Sign in to your security dashboard' : 'Create a new analyst account'}
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-group">
                <User className="input-icon" size={16} />
                <input
                  className="form-input"
                  type="text"
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-group">
              <Mail className="input-icon" size={16} />
              <input
                className="form-input"
                type="email"
                placeholder="analyst@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group" style={{ position: 'relative' }}>
              <Lock className="input-icon" size={16} />
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '12px', marginTop: 4 }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <Shield size={16} />
                {isLogin ? 'Sign In Securely' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} /> OR
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={handleGoogle}
          disabled={loading}
          style={{ justifyContent: 'center', padding: '12px', gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
          </svg>
          Sign in with Google
        </button>

        <div className="auth-footer">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="auth-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register here' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  );
}
