// src/context/AppContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, SessionListItem, UserModule } from '../types';
import { ensureCsrf, setUnauthenticatedHandler } from '../api/client';
import { me, refresh, doLogout } from '../api/auth';
import { listSessions, getSession } from '../api/sessions';
import { getBalance } from '../api/balance';
import { listUserModules } from '../api/modules';
import { getSettings } from '../api/settings';
import type { SiteSettings } from '../api/settings';

export interface CoinBalances { gold: number; silver: number; bronze: number }
export interface CoinCosts    { gold: number; silver: number; bronze: number }

const DEFAULT_COSTS: CoinCosts = { gold: 0.3333333, silver: 0.6666666, bronze: 0.9999999 };
const ZERO_BALANCES: CoinBalances = { gold: 0, silver: 0, bronze: 0 };

type Ctx = {
  user: User | null;
  cid: string | null;
  setCid: (v: string | null) => void;
  sessions: SessionListItem[];
  setSessions: (s: SessionListItem[]) => void;
  lastCidKey: (uid: string) => string;
  authReady: boolean;
  authed: boolean;
  showModulePicker: boolean;
  setShowModulePicker: (v: boolean) => void;
  moduleStarting: boolean;
  setModuleStarting: (v: boolean) => void;
  balances: CoinBalances;
  costs: CoinCosts;
  setBalances: (v: CoinBalances) => void;
  refreshBalance: () => Promise<void>;
  userModules: UserModule[];
  refreshUserModules: () => Promise<void>;
  siteSettings: SiteSettings;
  refreshSettings: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export function AppProvider({ children }: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [cid, setCid]   = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [moduleStarting, setModuleStarting] = useState(false);
  const [balances, setBalances] = useState<CoinBalances>(ZERO_BALANCES);
  const [costs, setCosts] = useState<CoinCosts>(DEFAULT_COSTS);
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const lastCidKey = (uid: string) => `CHAT_XAI_LAST_CID__${uid||'anon'}`;

  const refreshBalance = useCallback(async () => {
    try {
      const b = await getBalance();
      setBalances({ gold: b.coins_gold ?? 0, silver: b.coins_silver ?? 0, bronze: b.coins_bronze ?? 0 });
      if (b.costs) setCosts(b.costs);
    } catch { /* noop */ }
  }, []);

  const refreshUserModules = useCallback(async () => {
    try {
      const r = await listUserModules();
      setUserModules(r.items);
    } catch { /* noop */ }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSiteSettings(s);
    } catch { /* noop */ }
  }, []);

  const bootstrapAuth = useCallback(async () => {
    await ensureCsrf();
    try {
      const u = await me();
      setUser(u);
      setAuthed(true);
      return u;
    } catch {
      try {
        await refresh();
        const u = await me();
        setUser(u);
        setAuthed(true);
        return u;
      } catch {
        setUser(null);
        setAuthed(false);
        return null;
      }
    } finally {
      setAuthReady(true);
    }
  }, []);

  const bootstrapCid = useCallback(async (_uid: string) => {
    // Sempre inicia sem sessão ativa — o usuário escolhe qual abrir na sidebar
    return null;
  }, []);

  useEffect(() => {
    // Só ativa o handler de sessão expirada quando o usuário está autenticado.
    // Durante o bootstrap (authed=false), um 401 em me() não deve disparar doLogout().
    setUnauthenticatedHandler(authed ? () => doLogout() : null);
  }, [authed]);

  useEffect(() => {
    (async () => {
      const u = await bootstrapAuth();
      if (!u) return;
      await bootstrapCid(String(u.id));
      const l = await listSessions();
      setSessions(l.items || []);
      await refreshBalance();
      await refreshUserModules();
      await refreshSettings();
    })();
  }, [bootstrapAuth, bootstrapCid, refreshBalance, refreshUserModules, refreshSettings]);

  const value: Ctx = {
    user, cid, setCid: (v) => setCid(v),
    sessions, setSessions,
    lastCidKey,
    authReady, authed,
    showModulePicker, setShowModulePicker,
    moduleStarting, setModuleStarting,
    balances, costs, setBalances, refreshBalance,
    userModules, refreshUserModules,
    siteSettings, refreshSettings,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
