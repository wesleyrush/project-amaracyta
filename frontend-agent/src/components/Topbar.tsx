// src/components/Topbar.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { listModules } from '../api/modules';
import AkashaLogo from './AkashaLogo';
import type { Module } from '../types';
import { doLogout } from '../api/auth';
import { useTheme } from '../hooks/useTheme';

function initialsFromName(name?: string | null) {
  const t = (name || '').trim();
  if (!t) return 'U';
  const [a, b] = t.split(/\s+/);
  return ((a?.[0] || '') + (b?.[0] || a?.[1] || '')).toUpperCase();
}

function fmtSessionDate(dt: string | null | undefined): string {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PersonAvatarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
);

interface TopbarProps {
  forceDefault?: boolean;
  sidebarCollapsed?: boolean;
}

export default function Topbar({ forceDefault, sidebarCollapsed }: TopbarProps) {
  const navigate = useNavigate();
  const { user, balances, cid, sessions, userModules, siteSettings } = useApp();
  const currentSession = sessions.find(s => s.id === cid) ?? null;
  const [moduleMap, setModuleMap] = useState<Record<number, Module>>({});

  useEffect(() => {
    listModules().then(r => {
      const map: Record<number, Module> = {};
      r.items.forEach(m => { map[m.id] = m; });
      setModuleMap(map);
    }).catch(() => {});
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = useMemo(() => initialsFromName(user?.full_name), [user]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.topbar-right')) { setMenuOpen(false); }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const allZero = balances.gold === 0 && balances.silver === 0 && balances.bronze === 0;
  const totalAvailableModules = userModules.reduce((sum, m) => sum + m.available_qty, 0);

  // Coin balance is only relevant when free-type modules exist.
  // While moduleMap is still loading (empty), keep showing to avoid flash.
  const hasFreeModules = Object.keys(moduleMap).length === 0
    || Object.values(moduleMap).some(m => m.module_type === 'free' || !m.module_type);

  return (
    <>
      {/* Topbar de brand — visível apenas no mobile */}
      <header className="mobile-brand-bar">
        {siteSettings.logo_url
          ? <img src={siteSettings.logo_url} className="mobile-brand-logo" alt="logo" />
          : siteSettings.logo_svg
            ? <span className="mobile-brand-logo-svg" dangerouslySetInnerHTML={{ __html: siteSettings.logo_svg }} />
            : <AkashaLogo size={40} />
        }
        <span className="mobile-brand-title">{siteSettings.site_title || 'JORNADA AKASHA'}</span>
      </header>

      <header className="topbar" style={sidebarCollapsed ? { paddingLeft: 70 } : undefined}>
        <div className="topbar-title-area">

          {!forceDefault && currentSession ? (() => {
            const personName = currentSession.child_id
              ? (currentSession.child_name || 'Filho(a)')
              : (user?.full_name || 'Eu');
            return (
              <div className="chat-contact-header">
                <div className="chat-contact-avatar">
                  <PersonAvatarIcon />
                </div>
                <div className="chat-contact-info">
                  <span className="chat-contact-name">{personName}</span>
                  {currentSession.module_name && (
                    <span className="chat-contact-meta">
                      {currentSession.module_name}
                      {currentSession.created_at ? ` · ${fmtSessionDate(currentSession.created_at)}` : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })() : null}
        </div>

        <div className="topbar-right">
          {/* Saldo de moedas — oculto quando não há módulos gratuitos no sistema */}
          {hasFreeModules && <div className="coin-balance" title="Saldo de moedas">
            <span className="coin-balance-label">Seu saldo atual:</span>
            {allZero ? (
              <button className="coin-buy-btn" onClick={() => navigate('/store')} title="Comprar moedas">
                ✦ Comprar moedas
              </button>
            ) : (
              <>
                {balances.gold > 0 && (
                  <span className="coin-item coin-gold" title="Moedas de Ouro">
                    🟡 {balances.gold.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </span>
                )}
                {balances.silver > 0 && (
                  <span className="coin-item coin-silver" title="Moedas de Prata">
                    ⚪ {balances.silver.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </span>
                )}
                {balances.bronze > 0 && (
                  <span className="coin-item coin-bronze" title="Moedas de Cobre">
                    🟤 {balances.bronze.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </span>
                )}
              </>
            )}
          </div>}

          {/* Toggle de tema */}
          <button
            className={`theme-toggle-switch ${isDark ? 'theme-toggle-switch--dark' : 'theme-toggle-switch--light'}`}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema"
          >
            <span className="theme-toggle-track">
              <span className="theme-toggle-thumb">
                <span className={isDark ? 'theme-toggle-icon--dark' : undefined}>{isDark ? '🌙' : '☀️'}</span>
              </span>
              <span className="theme-toggle-label">
                {isDark ? 'Escuro' : 'Claro'}
              </span>
            </span>
          </button>

          {/* Módulos disponíveis */}
          {userModules.length > 0 && (
            <div className="module-balance">
              <span className="module-balance-label">Módulos:</span>
              {totalAvailableModules > 0 ? (
                <span className="module-balance-count available">
                  📦 {totalAvailableModules}  {totalAvailableModules !== 1 ? 'disponíveis' : 'disponível'}
                  <div className="module-balance-dropdown">
                    {userModules.filter(um => um.available_qty > 0).map(um => (
                      <div key={um.module_id} className="module-balance-row">
                        <span className="module-balance-name">
                          {moduleMap[um.module_id]?.name ?? `Módulo #${um.module_id}`}
                        </span>
                        <span className="module-balance-qty">{um.available_qty}x</span>
                      </div>
                    ))}
                  </div>
                </span>
              ) : (
                <button className="coin-buy-btn" onClick={() => navigate('/store')} title="Ativar módulos">
                  📦 Ativar Módulos
                </button>
              )}
            </div>
          )}

          {/* Avatar com dropdown */}
          <button
            className="user-avatar-btn"
            title="Minha conta"
            onClick={() => setMenuOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <span className="user-initials">{initials}</span>
            <span className="user-chevron">▾</span>
          </button>

          <div className="user-menu" hidden={!menuOpen}>
            <div className="user-menu-header">
              <span className="user-menu-name">{user?.full_name || 'Usuário'}</span>
              <span className="user-menu-email">{user?.email || ''}</span>
            </div>
            <div className="user-menu-sep" />
            <button onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
              <span>⚙️</span> Perfil e Configurações
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/profile/password'); }}>
              <span>🔑</span> Alterar Senha
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/children'); }}>
              <span>👥</span> Cadastro de Filhos
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/store'); }}>
              <span>📦</span> Ativar Módulos
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/history'); }}>
              <span>📋</span> Histórico de Ações
            </button>
            <div className="user-menu-sep" />
            <button className="danger" onClick={doLogout}>
              <span>↪</span> Sair
            </button>
          </div>
        </div>
      </header>

    </>
  );
}
