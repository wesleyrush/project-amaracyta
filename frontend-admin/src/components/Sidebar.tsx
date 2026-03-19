import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Minimal monochrome SVG icons ───────────────────────────── */
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const IconBot = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M9 4h6M12 4v4"/>
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4"/>
    <path d="M3 21v-2a7 7 0 0114 0v2"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
    <path d="M21 21v-2a4 4 0 00-3-3.87"/>
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21,8 21,21 3,21 3,8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);

const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

/* ── Nav config ────────────────────────────────────────────── */
const NAV = [
  { label: 'Home', icon: <IconHome />, path: '/' },
  {
    label: 'Agente', icon: <IconBot />, resource: 'agente', children: [
      { label: 'Incluir Módulo', path: '/modulos/novo' },
      { label: 'Listar Módulos', path: '/modulos' },
      { label: 'Pacotes de Módulos', path: '/modulos/pacotes' },
    ],
  },
  {
    label: 'Baús de Moedas', icon: <IconBox />, resource: 'cobranca', children: [
      { label: 'Listar Baús', path: '/cobranca/baus' },
      { label: 'Proporção Cobrança', path: '/cobranca/proporcoes' },
    ],
  },
  {
    label: 'Clientes', icon: <IconUsers />, resource: 'clientes', children: [
      { label: 'Listar Clientes', path: '/clientes' },
    ],
  },
  {
    label: 'Pedidos', icon: <IconClipboard />, resource: 'cobranca', children: [
      { label: 'Listar Pedidos', path: '/cobranca/pedidos' },
    ],
  },
  {
    label: 'Usuários', icon: <IconShield />, resource: 'usuarios', children: [
      { label: 'Incluir Usuário', path: '/usuarios/novo' },
      { label: 'Listar Usuários', path: '/usuarios' },
    ],
  },
  { label: 'Configurações', icon: <IconSettings />, path: '/configuracoes' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { hasResource } = useAuth();
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (label: string) =>
    setOpen(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        {!collapsed && <span className="sidebar-logo">✦</span>}
        {!collapsed && <span className="sidebar-title">Amaracytã</span>}
        {!collapsed && <span className="sidebar-sub">Admin</span>}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <IconMenu />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.filter(item => !('resource' in item) || hasResource((item as any).resource)).map(item =>
          'children' in item ? (
            <div key={item.label} className="nav-group">
              <button
                className={`nav-group-btn${open.includes(item.label) ? ' open' : ''}`}
                onClick={() => toggle(item.label)}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && (
                  <span className="nav-arrow">
                    {open.includes(item.label)
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18,15 12,9 6,15"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>
                    }
                  </span>
                )}
              </button>
              {open.includes(item.label) && !collapsed && (
                <div className="nav-children">
                  {item.children!.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) => `nav-child${isActive ? ' active' : ''}`}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={(item as any).path}
              to={(item as any).path}
              end
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
