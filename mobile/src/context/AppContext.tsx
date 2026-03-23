import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, SessionListItem, UserModule, CoinBalances, CoinCosts, SiteSettings } from '../types';
import { me, refresh } from '../api/auth';
import { listSessions, getSession } from '../api/sessions';
import { getBalance } from '../api/balance';
import { listUserModules } from '../api/modules';
import { getSettings } from '../api/settings';

export type { CoinBalances, CoinCosts };

const DEFAULT_COSTS: CoinCosts = { gold: 0.3333333, silver: 0.6666666, bronze: 0.9999999 };
const ZERO_BALANCES: CoinBalances = { gold: 0, silver: 0, bronze: 0 };

type Ctx = {
  user: User | null;
  cid: string | null;
  setCid: (v: string) => void;
  sessions: SessionListItem[];
  setSessions: (s: SessionListItem[]) => void;
  authReady: boolean;
  authed: boolean;
  setAuthed: (v: boolean) => void;
  setUser: (v: User | null) => void;
  showModulePicker: boolean;
  setShowModulePicker: (v: boolean) => void;
  balances: CoinBalances;
  costs: CoinCosts;
  setBalances: (v: CoinBalances) => void;
  refreshBalance: () => Promise<void>;
  userModules: UserModule[];
  refreshUserModules: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  siteSettings: SiteSettings;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const LAST_CID_KEY = (uid: string) => `CHAT_LAST_CID_${uid}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cid, setCidState] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [balances, setBalances] = useState<CoinBalances>(ZERO_BALANCES);
  const [costs, setCosts] = useState<CoinCosts>(DEFAULT_COSTS);
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const userRef = useRef<User | null>(null);

  const setCid = useCallback((v: string) => {
    setCidState(v);
    const uid = userRef.current?.id;
    if (uid) AsyncStorage.setItem(LAST_CID_KEY(String(uid)), v).catch(() => {});
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const b = await getBalance();
      if ((b as any).balances) {
        const bal = (b as any).balances as CoinBalances;
        setBalances(bal);
        if ((b as any).costs) setCosts((b as any).costs);
      } else {
        const raw = b as any;
        setBalances({
          gold: raw.coins_gold ?? raw.gold ?? 0,
          silver: raw.coins_silver ?? raw.silver ?? 0,
          bronze: raw.coins_bronze ?? raw.bronze ?? 0,
        });
        if (raw.costs) setCosts(raw.costs);
      }
    } catch {}
  }, []);

  const refreshUserModules = useCallback(async () => {
    try {
      const r = await listUserModules();
      setUserModules(r.items ?? []);
    } catch {}
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list ?? []);
    } catch {}
  }, []);

  const handleSetUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUser(u);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let u: User;
        try { u = await me(); }
        catch {
          await refresh();
          u = await me();
        }
        handleSetUser(u);
        setAuthed(true);

        const list = await listSessions().catch(() => [] as SessionListItem[]);
        setSessions(list);

        const lastCid = await AsyncStorage.getItem(LAST_CID_KEY(String(u.id)));
        if (lastCid) {
          try { await getSession(lastCid); setCidState(lastCid); }
          catch { if (list.length) setCidState(list[0].id); else setShowModulePicker(true); }
        } else if (list.length) {
          setCidState(list[0].id);
        } else {
          setShowModulePicker(true);
        }

        await Promise.all([refreshBalance(), refreshUserModules()]);
        try { const s = await getSettings(); setSiteSettings(s); } catch {}
      } catch {
        setAuthed(false);
        handleSetUser(null);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  const value: Ctx = {
    user, cid, setCid,
    sessions, setSessions,
    authReady, authed, setAuthed,
    setUser: handleSetUser,
    showModulePicker, setShowModulePicker,
    balances, costs, setBalances, refreshBalance,
    userModules, refreshUserModules,
    refreshSessions,
    siteSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
