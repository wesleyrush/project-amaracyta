import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { me, refresh } from '../api/auth';
import { listSessions } from '../api/sessions';
import { getBalance } from '../api/balance';
import { listUserModules } from '../api/modules';
import { getSettings } from '../api/settings';
import { ensureCsrf } from '../api/client';
import type { User, SessionListItem, CoinBalances, CoinCosts, UserModule, SiteSettings } from '../types';

interface AppCtx {
  user: User | null;
  authed: boolean;
  authReady: boolean;
  cid: string;
  sessions: SessionListItem[];
  balances: CoinBalances;
  costs: CoinCosts;
  userModules: UserModule[];
  siteSettings: SiteSettings;
  setUser: (u: User | null) => void;
  setCid: (id: string) => void;
  setSessions: (s: SessionListItem[]) => void;
  setBalances: (b: CoinBalances) => void;
  refreshBalance: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshUserModules: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultBalances: CoinBalances = { gold: 0, silver: 0, bronze: 0 };
const defaultCosts: CoinCosts = { gold: 0.333, silver: 0.667, bronze: 1.0 };

const Ctx = createContext<AppCtx>(null!);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cid, setCidState] = useState('');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [balances, setBalances] = useState<CoinBalances>(defaultBalances);
  const [costs, setCosts] = useState<CoinCosts>(defaultCosts);
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});

  const setUser = (u: User | null) => setUserState(u);

  const setCid = useCallback(async (id: string) => {
    setCidState(id);
    if (user) {
      await AsyncStorage.setItem(`LAST_CID__${user.id}`, id);
    }
  }, [user]);

  const refreshBalance = useCallback(async () => {
    try {
      const data = await getBalance();
      setBalances(data.balances);
      if (data.costs) setCosts(data.costs);
    } catch {}
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch {}
  }, []);

  const refreshUserModules = useCallback(async () => {
    try {
      const r = await listUserModules();
      setUserModules(r.items);
    } catch {}
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSiteSettings(s);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ensureCsrf();
        let u: User;
        try {
          u = await me();
        } catch (e: any) {
          if (e?.response?.status === 401) {
            await refresh();
            u = await me();
          } else throw e;
        }
        setUserState(u);
        const [sessionList] = await Promise.all([
          listSessions().catch(() => [] as SessionListItem[]),
          getBalance().then(d => { setBalances(d.balances); if (d.costs) setCosts(d.costs); }).catch(() => {}),
          listUserModules().then(r => setUserModules(r.items)).catch(() => {}),
          getSettings().then(s => setSiteSettings(s)).catch(() => {}),
        ]);
        setSessions(sessionList);
        const lastCid = await AsyncStorage.getItem(`LAST_CID__${u.id}`);
        if (lastCid && sessionList.find(s => s.id === lastCid)) {
          setCidState(lastCid);
        } else if (sessionList.length > 0) {
          setCidState(sessionList[0].id);
        }
      } catch {
        setUserState(null);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  return (
    <Ctx.Provider value={{
      user, authed: !!user, authReady,
      cid, setCid,
      sessions, setSessions,
      balances, costs, setBalances,
      userModules, siteSettings,
      refreshBalance, refreshSessions, refreshUserModules, refreshSettings,
      setUser,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
