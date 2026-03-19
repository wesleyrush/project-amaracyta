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
}

export default function Topbar({ forceDefault }: TopbarProps) {
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

  return (
    <>
      <header className="topbar">
        <div className="topbar-title-area">
          {!forceDefault && currentSession?.module_id ? (() => {
            const mod = moduleMap[currentSession.module_id!];
            return (
              <>
                {mod?.image_svg && (
                  <span className="topbar-module-icon" dangerouslySetInnerHTML={{ __html: mod.image_svg }} />
                )}
                <span className="topbar-conv-title">
                  {currentSession.module_name ?? currentSession.title}
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
          {/* Saldo de moedas */}
          <div className="coin-balance" title="Saldo de moedas">
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
          </div>

          {/* Módulos disponíveis */}
          {userModules.length > 0 && (
            <div className="module-balance" title="Módulos disponíveis para uso">
              <span className="module-balance-label">Módulos:</span>
              {totalAvailableModules > 0 ? (
                <span className="module-balance-count available">
                  📦 {totalAvailableModules} disponível{totalAvailableModules !== 1 ? 'is' : ''}
                </span>
              ) : (
                <button className="coin-buy-btn" onClick={() => navigate('/store')} title="Comprar módulos">
                  📦 Comprar módulos
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
            <button onClick={() => { setMenuOpen(false); navigate('/store'); }}>
              <span>🛒</span> Comprar Créditos
            </button>
            <button onClick={() => { setMenuOpen(false); navigate('/history'); }}>
              <span>📋</span> Histórico de consumo
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
