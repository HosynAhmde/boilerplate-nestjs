'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, apiPost, refreshAccessToken, setAccessToken, setSessionExpiredHandler } from './api';

export type SectionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface Me {
  id: string;
  fullName: string;
  mobile: string;
  roleId: string;
  permissions: { sections: Record<string, SectionAction[]>; special: string[] };
}

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: Me | null;
  /** Called after a successful OTP verify. */
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (section: string, action?: SectionAction) => boolean;
  hasSpecial: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Me | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const loadMe = useCallback(async () => {
    setUser(await api<Me>('/auth/me'));
    setStatus('authenticated');
  }, []);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    setSessionExpiredHandler(clear);
    void (async () => {
      if (await refreshAccessToken()) {
        await loadMe().catch(clear);
      } else {
        setStatus('anonymous');
      }
    })();
    return () => setSessionExpiredHandler(null);
  }, [clear, loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: async (token) => {
        setAccessToken(token);
        await loadMe();
      },
      signOut: async () => {
        await apiPost('/auth/logout').catch(() => undefined);
        clear();
      },
      can: (section, action = 'view') =>
        user?.permissions.sections[section]?.includes(action) ?? false,
      hasSpecial: (code) => user?.permissions.special.includes(code) ?? false,
    }),
    [status, user, loadMe, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
