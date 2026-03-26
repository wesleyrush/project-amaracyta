// src/components/Topbar.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AkashaLogo from './AkashaLogo';
import { listModules } from '../api/modules';
import type { Module } from '../types';
import { doLogout } from '../api/auth';

function initialsFromName(name?: string | null) {
  const t = (name || '').trim();
  if (!t) return 'U';
  const [a, b] = t.split(/\s+/);
  return ((a?.[0] || '') + (b?.[0] || a?.[1] || '')).toUpperCase();
}

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

  const allZero = balances.gold === 0 && balances.silver === 0 && balances.bronze === 0;
  const totalAvailableModules = userModules.reduce((sum, m) => sum + m.available_qty, 0);

  // Coin balance is only relevant when free-type modules exist.
  // While moduleMap is still loading (empty), keep showing to avoid flash.
  const hasFreeModules = Object.keys(moduleMap).length === 0
    || Object.values(moduleMap).some(m => m.module_type === 'free' || !m.module_type);

  return (
    <>
      <header className="topbar" style={sidebarCollapsed ? { paddingLeft: 70 } : undefined}>
        <div className="topbar-title-area">
          {!forceDefault && currentSession?.module_id ? (() => {
            const mod = moduleMap[currentSession.module_id!];
            return (
              <>
                {mod?.image_svg && (
                  (mod.image_svg.startsWith('http') || mod.image_svg.startsWith('/'))
                    ? <img className="topbar-module-icon" src={mod.image_svg} alt={mod.name} style={{ padding: '13px 0 5px 0', height: 36, objectFit: 'contain' }} />
                    : <span className="topbar-module-icon" style={{padding:'13px 0 5px 0'}} dangerouslySetInnerHTML={{ __html: mod.image_svg }} />
                )}
                <span className="topbar-conv-title"  style={{padding:'13px 0 5px 0'}}>
                  Módulo: {currentSession.module_name ?? currentSession.title}
                </span>
              </>
            );
          })() : (
            <>
              {siteSettings.logo_url
                ? <img src={siteSettings.logo_url} className="topbar-logo-img" alt="logo" />
                : siteSettings.logo_svg
                  ? <span className="topbar-module-icon" dangerouslySetInnerHTML={{ __html: siteSettings.logo_svg }} />
                  : <AkashaLogo size={48} />
              }
              <strong className="brand-title">{siteSettings.site_title || 'JORNADA AKASHA'}</strong>
            </>
          )}
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
