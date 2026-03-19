import { useEffect, useMemo, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import Topbar from '../components/Topbar';
import ModulePicker from '../components/ModulePicker';
import { SidebarToggle } from "../components/SidebarToggle";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useApp } from '../context/AppContext';
import { createSession } from '../api/sessions';
import { listSessions } from '../api/sessions';
import type { Module } from '../types';

export default function ChatPage(){
  const isDesktop = useMediaQuery("(min-width: 961px)");
  const { showModulePicker, setShowModulePicker, setCid, setSessions, user, lastCidKey, refreshUserModules } = useApp();

  const [isCollapsed, setCollapsed]   = useState(false);
  const [isOpenMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      setOpenMobile(false);
    } else {
      setCollapsed(false);
      setOpenMobile(false);
    }
  }, [isDesktop]);

  const handleToggle = useCallback(() => {
    if (isDesktop) {
      setCollapsed(c => !c);
    } else {
      setOpenMobile(o => !o);
    }
  }, [isDesktop]);

  const shellClass = useMemo(() => {
    const cls = ["app-shell"];
    if (isDesktop) {
      cls.push("sidebar-open");
      if (isCollapsed) cls.push("sidebar-collapsed");
    } else {
      if (isOpenMobile) cls.push("sidebar-open");
    }
    return cls.join(" ");
  }, [isDesktop, isCollapsed, isOpenMobile]);

  async function handleModuleSelected(module: Module, childId: number | null) {
    const { id } = await createSession(module.id, childId);
    setCid(id);
    if (user) localStorage.setItem(lastCidKey(String(user.id)), id);
    const list = await listSessions();
    setSessions(list.items || []);
    refreshUserModules().catch(() => {});
    setShowModulePicker(false);
  }

  return (
    <div id="appShell" className={shellClass}>
      <SidebarToggle onToggle={handleToggle} />

      <div
        className="sidebar-backdrop"
        onClick={() => setOpenMobile(false)}
      />

      <Sidebar onToggle={handleToggle} />

      <main className="main">
        <Topbar />
        <Chat />
      </main>

      {showModulePicker && (
        <ModulePicker
          onSelect={handleModuleSelected}
          onCancel={() => setShowModulePicker(false)}
          showCancel={true}
        />
      )}
    </div>
  );
}
