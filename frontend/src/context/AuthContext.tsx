import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  getIdToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { firebaseAuth } from '../firebase';
import { getMe } from '../api';

interface User {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const registering = useRef(false);

  // Keep local state in sync with the Firebase session
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (registering.current) return;
      if (!fbUser) {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
        const res = await getMe();
        setUser(res.data);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    setToken(await cred.user.getIdToken());
    const res = await getMe();
    setUser(res.data);
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    setToken(await cred.user.getIdToken());
    const res = await getMe();
    setUser(res.data);
  };

  // Role is assigned server-side (analyst by default); the role argument is ignored.
  const register = async (data: { name: string; email: string; password: string; role: string }) => {
    registering.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.name });
      await getIdToken(cred.user, true); // refresh so the token carries the name
      await getMe(); // creates the local profile
      await signOut(firebaseAuth);
    } finally {
      registering.current = false;
    }
  };

  const logout = () => {
    signOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
