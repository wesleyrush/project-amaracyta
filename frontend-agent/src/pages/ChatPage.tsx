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
  const { showModulePicker, setShowModulePicker, moduleStarting, setModuleStarting, setCid, setSessions, refreshUserModules, siteSettings } = useApp();

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
    setModuleStarting(true);
    const { id } = await createSession(module.id, childId);
    setCid(id);
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
        <Topbar sidebarCollapsed={isCollapsed} />
        <Chat />
      </main>

      {showModulePicker && (
        <ModulePicker
          onSelect={handleModuleSelected}
          onCancel={() => setShowModulePicker(false)}
          showCancel={true}
        />
      )}

      {moduleStarting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.72)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt="logo"
                style={{ width: 80, height: 80, objectFit: 'contain', animation: 'modulePulse 1.8s ease-in-out infinite' }}
              />
            ) : siteSettings.logo_svg ? (
              <div
                style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'modulePulse 1.8s ease-in-out infinite' }}
                dangerouslySetInnerHTML={{ __html: siteSettings.logo_svg }}
              />
            ) : (
              <div style={{ fontSize: 64, lineHeight: 1, animation: 'modulePulse 1.8s ease-in-out infinite', color: '#fff' }}>
                ✦
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#fff',
                  animation: `moduleDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.7,
                }} />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes modulePulse {
              0%, 100% { transform: scale(1);   opacity: 1;    }
              50%       { transform: scale(1.1); opacity: 0.75; }
            }
            @keyframes moduleDot {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40%            { transform: scale(1.1); opacity: 1;   }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
