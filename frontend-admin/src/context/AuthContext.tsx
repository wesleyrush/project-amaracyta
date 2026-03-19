import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe, logout as apiLogout } from '../api/auth';
import type { AdminUser } from '../types';

interface AuthCtx {
  user: AdminUser | null;
  loading: boolean;
  setUser: (u: AdminUser | null) => void;
  logout: () => Promise<void>;
  hasPerm: (resource: string, action: 'insert' | 'update' | 'delete') => boolean;
  hasResource: (resource: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  };

  const hasPerm = (resource: string, action: 'insert' | 'update' | 'delete') => {
    if (!user) return false;
    const p = user.permissions?.find(x => x.resource === resource);
    if (!p) return false;
    const map = { insert: 'can_insert', update: 'can_update', delete: 'can_delete' } as const;
    return Boolean(p[map[action]]);
  };

  const hasResource = (resource: string) => {
    if (!user) return false;
    const p = user.permissions?.find(x => x.resource === resource);
    if (!p) return false;
    return Boolean(p.can_insert || p.can_update || p.can_delete);
  };

  return <Ctx.Provider value={{ user, loading, setUser, logout, hasPerm, hasResource }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
