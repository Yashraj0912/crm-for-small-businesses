import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken } from './lib/api';
import type { User } from './lib/types';

interface Ctx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (b: { org_name: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const qc = useQueryClient();

  useEffect(() => {
    if (!getToken()) return;
    api.get<User>('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    window.addEventListener('clientbook-logout', logout);
    return () => window.removeEventListener('clientbook-logout', logout);
  }, [logout]);

  const finish = (r: { access_token: string; user: User }) => {
    setToken(r.access_token);
    setUser(r.user);
  };

  return (
    <AuthCtx.Provider
      value={{
        user, loading, logout,
        login: async (email, password) => finish(await api.post('/auth/login', { email, password })),
        register: async (b) => finish(await api.post('/auth/register', b)),
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
