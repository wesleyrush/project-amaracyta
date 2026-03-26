// src/components/InternalLayout.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Topbar from './Topbar';
import InternalSidebar from './InternalSidebar';
import { SidebarToggle } from './SidebarToggle';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function InternalLayout({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 961px)');
  const [isCollapsed, setCollapsed] = useState(false);
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
    const cls = ['app-shell'];
    if (isDesktop) {
      cls.push('sidebar-open');
      if (isCollapsed) cls.push('sidebar-collapsed');
    } else {
      if (isOpenMobile) cls.push('sidebar-open');
    }
    return cls.join(' ');
  }, [isDesktop, isCollapsed, isOpenMobile]);

  return (
    <div className={shellClass}>
      <SidebarToggle onToggle={handleToggle} />
      <div className="sidebar-backdrop" onClick={() => setOpenMobile(false)} />
      <InternalSidebar onToggle={handleToggle} />
      <main className="main">
        <Topbar forceDefault sidebarCollapsed={isCollapsed} />
        <div className="internal-content">
          {children}
        </div>
      </main>
    </div>
  );
}
