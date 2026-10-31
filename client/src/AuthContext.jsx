import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!localStorage.getItem('token')) { if (active) setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        if (active) setUser(res.data.data.user);
      } catch {
        localStorage.removeItem('token');
        if (active) setUser(null);
      } finally { if (active) setLoading(false); }
    };
    init();
    return () => { active = false; };
  }, []);
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: loggedInUser } = res.data.data;
    localStorage.setItem('token', token);
    setUser(loggedInUser);
    return loggedInUser;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return (
    <AuthContext.Provider value={{ user, login, logout, isHR: user?.role === 'hr', loading }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
