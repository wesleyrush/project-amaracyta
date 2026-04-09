import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { listChests } from '../api/chests';
import { listModules, listModulePackages, listUserModules, listModuleLevels } from '../api/modules';
import type { CoinChest, Module, ModuleLevel, ModulePackage, UserModule } from '../types';
import { swal } from '../utils/swal';

type CoinType = 'gold' | 'silver' | 'bronze';
type StoreTab = 'chests' | 'modules';

function ChestSVG({ type }: { type: CoinType }) {
  const palettes: Record<CoinType, { body: string; lid: string; band: string; lock: string; coins: string; coinShadow: string }> = {
    gold:   { body: '#8B4513', lid: '#6B3410', band: '#DAA520', lock: '#FFD700', coins: '#FFD700', coinShadow: '#B8860B' },
    silver: { body: '#5C5C5C', lid: '#444444', band: '#C0C0C0', lock: '#E8E8E8', coins: '#C0C0C0', coinShadow: '#808080' },
    bronze: { body: '#7B3F00', lid: '#5C2E00', band: '#CD7F32', lock: '#E8963A', coins: '#CD7F32', coinShadow: '#8B4513' },
  };
  const p = palettes[type];
  return (
    <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" className="chest-svg">
      <ellipse cx="60" cy="97" rx="42" ry="5" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="28" cy="88" rx="9" ry="4" fill={p.coins} />
      <ellipse cx="28" cy="86" rx="9" ry="4" fill={p.coinShadow} />
      <ellipse cx="28" cy="84" rx="9" ry="4" fill={p.coins} />
      <ellipse cx="92" cy="88" rx="9" ry="4" fill={p.coins} />
      <ellipse cx="92" cy="86" rx="9" ry="4" fill={p.coinShadow} />
      <ellipse cx="92" cy="84" rx="9" ry="4" fill={p.coins} />
      <ellipse cx="50" cy="90" rx="8" ry="3.5" fill={p.coinShadow} />
      <ellipse cx="50" cy="88" rx="8" ry="3.5" fill={p.coins} />
      <ellipse cx="72" cy="90" rx="8" ry="3.5" fill={p.coinShadow} />
      <ellipse cx="72" cy="88" rx="8" ry="3.5" fill={p.coins} />
      <rect x="14" y="58" width="92" height="36" rx="5" fill={p.body} />
      <rect x="14" y="58" width="92" height="8" rx="5" fill="rgba(255,255,255,0.08)" />
      <rect x="14" y="70" width="92" height="8" fill={p.band} />
      <rect x="14" y="70" width="92" height="3" fill="rgba(255,255,255,0.2)" />
      <path d="M14 58 Q14 20 60 18 Q106 20 106 58 Z" fill={p.lid} />
      <path d="M18 58 Q18 26 60 24 Q102 26 102 58 Z" fill="rgba(0,0,0,0.35)" />
      <path d="M14 50 Q14 46 60 44 Q106 46 106 50 L106 56 Q106 52 60 50 Q14 52 14 56 Z" fill={p.band} />
      <rect x="12" y="58" width="8" height="36" rx="3" fill={p.band} />
      <rect x="100" y="58" width="8" height="36" rx="3" fill={p.band} />
      <rect x="12" y="58" width="3" height="36" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="105" y="58" width="3" height="36" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="49" y="66" width="22" height="18" rx="4" fill={p.band} />
      <rect x="51" y="67" width="18" height="7" rx="2" fill="rgba(255,255,255,0.15)" />
      <path d="M54 66 Q54 59 60 59 Q66 59 66 66" stroke={p.lock} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="75" r="3" fill={p.lock} />
      <rect x="58.5" y="75" width="3" height="4" rx="1" fill={p.lock} />
      <ellipse cx="60" cy="58" rx="30" ry="7" fill={p.coinShadow} />
      <ellipse cx="45" cy="56" rx="8" ry="3.5" fill={p.coins} />
      <ellipse cx="60" cy="54" rx="8" ry="3.5" fill={p.coins} />
      <ellipse cx="75" cy="56" rx="8" ry="3.5" fill={p.coins} />
      <ellipse cx="52" cy="51" rx="7" ry="3" fill={p.coinShadow} />
      <ellipse cx="68" cy="51" rx="7" ry="3" fill={p.coins} />
    </svg>
  );
}

const COIN_CONFIG: Record<CoinType, {
  label: string; gradient: string; badgeClass: string; features: string[]; btnLabel: string;
}> = {
  gold:   { label: 'Ouro',  gradient: 'store-card-gold',   badgeClass: 'badge-gold',   features: ['Menor custo por mensagem', 'Moedas premium de alto rendimento', 'Crédito imediato na carteira'], btnLabel: 'Selecionar Premium' },
  silver: { label: 'Prata', gradient: 'store-card-silver', badgeClass: 'badge-silver', features: ['Custo médio por mensagem', 'Ótima relação custo-benefício', 'Crédito imediato na carteira'], btnLabel: 'Escolher Plano' },
  bronze: { label: 'Cobre', gradient: 'store-card-bronze', badgeClass: 'badge-bronze', features: ['Ideal para começar', 'Custo padrão por mensagem', 'Crédito imediato na carteira'], btnLabel: 'Começar' },
};

// ── Aba Módulos ──────────────────────────────────────────────────────────────

function ModulesTab() {
  const navigate = useNavigate();
  const [modules,   setModules]   = useState<Module[]>([]);
  const [levels,    setLevels]    = useState<ModuleLevel[]>([]);
  const [packages,  setPackages]  = useState<ModulePackage[]>([]);
  const [ownedMap,  setOwnedMap]  = useState<Map<number, UserModule>>(new Map());
  // quantities: module_id -> units to purchase
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([listModules(), listModulePackages(), listUserModules(), listModuleLevels()])
      .then(([mods, pkgs, userMods, lvls]) => {
        setModules(mods.items.filter(m => m.module_type === 'fixed' && m.is_active));
        setPackages(pkgs.items);
        setOwnedMap(new Map(userMods.items.map(um => [um.module_id, um])));
        setLevels(lvls.items.filter(l => l.is_active));
      })
      .catch(() => swal.error('Erro', 'Não foi possível carregar os módulos.'))
      .finally(() => setLoading(false));
  }, []);

  const changeQty = (id: number, delta: number) => {
    setQuantities(prev => {
      const cur = prev[id] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  // Total units being purchased
  const totalQty = Object.values(quantities).reduce((s, n) => s + n, 0);

  // Qty por level_id (null = sem nível)
  const levelQtys = (): Map<number | null, number> => {
    const map = new Map<number | null, number>();
    for (const m of modules) {
      const q = quantities[m.id] ?? 0;
      if (q === 0) continue;
      const lid = m.level_id ?? null;
      map.set(lid, (map.get(lid) ?? 0) + q);
    }
    return map;
  };

  // Price: por nível, busca pacote matching (level_id, qty); senão, soma individual
  const getPrice = (): number | null => {
    if (totalQty === 0) return null;
    let total = 0;
    for (const [lid, qty] of levelQtys()) {
      const pkg = packages.find(p => p.level_id === lid && p.quantity === qty);
      if (pkg) {
        total += pkg.price_brl;
      } else {
        for (const m of modules) {
          const q = quantities[m.id] ?? 0;
          if (q === 0 || (m.level_id ?? null) !== lid) continue;
          total += (m.level_price_brl ?? m.price_brl ?? 0) * q;
        }
      }
    }
    return total;
  };

  // Próximo pacote por nível: retorna { level_id, nextPkg } para cada nível com seleção
  const nextPkgByLevel = (): Map<number | null, ModulePackage> => {
    const map = new Map<number | null, ModulePackage>();
    for (const [lid, qty] of levelQtys()) {
      const next = packages.find(p => p.level_id === lid && p.quantity === qty + 1);
      if (next) map.set(lid, next);
    }
    return map;
  };
  const currentPrice = getPrice();
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleBuy = () => {
    if (totalQty === 0) {
      swal.warning('Selecione módulos', 'Adicione ao menos uma unidade para continuar.');
      return;
    }
    const selectedMods = modules.filter(m => (quantities[m.id] ?? 0) > 0);
    navigate('/module-checkout', { state: { moduleQuantities: quantities, modules: selectedMods, price: currentPrice } });
  };

  if (loading) return <div className="store-loading">Carregando módulos...</div>;
  if (modules.length === 0) return <div className="store-empty">Nenhum módulo disponível no momento.</div>;

  // Agrupa módulos por nível, na ordem dos níveis; módulos sem nível ficam ao final
  const modulesByLevel = levels.map(lvl => ({
    level: lvl,
    mods: modules.filter(m => m.level_id === lvl.id),
  })).filter(g => g.mods.length > 0);
  const noLevelMods = modules.filter(m => !m.level_id);

  const renderCard = (m: Module) => {
    const owned = ownedMap.get(m.id);
    const buyQty = quantities[m.id] ?? 0;
    return (
      <div key={m.id} className={`module-store-card${buyQty > 0 ? ' module-card-selected' : ''}`}>
        {owned && (
          <div className="module-card-owned-badge">
            ✓ Já adquiriu {owned.quantity} · total {owned.available_qty > 1 ? 'disponíveis' : 'disponível'}: {owned.available_qty}
          </div>
        )}
        {m.image_svg && (
          (m.image_svg.startsWith('http') || m.image_svg.startsWith('/'))
            ? <img className="module-card-img" src={m.image_svg} alt={m.name} />
            : <div className="module-card-img" dangerouslySetInnerHTML={{ __html: m.image_svg }} />
        )}
        <h3 className="module-card-name">{m.name}</h3>
        {m.description && <p className="module-card-desc">{m.description}</p>}
        <div className="module-card-price">
          {(m.level_price_brl ?? m.price_brl) != null
            ? fmt(m.level_price_brl ?? m.price_brl ?? 0) + ' / unidade'
            : 'Consulte pacotes'}
        </div>
        <div className="module-qty-stepper">
          <button
            className="module-qty-btn"
            onClick={() => changeQty(m.id, -1)}
            disabled={buyQty === 0}
            aria-label="Remover unidade"
          >−</button>
          <span className="module-qty-value">{buyQty}</span>
          <button
            className="module-qty-btn"
            onClick={() => changeQty(m.id, 1)}
            aria-label="Adicionar unidade"
          >+</button>
        </div>
      </div>
    );
  };

  const _nextPkgByLevel = nextPkgByLevel();

  const renderLevelSection = (level: ModuleLevel, mods: Module[]) => {
    const lid = level.id;
    const levelSelectedQty = mods.reduce((s, m) => s + (quantities[m.id] ?? 0), 0);
    const levelPkgs = packages.filter(p => p.level_id === lid).sort((a, b) => a.quantity - b.quantity);
    const matchedPkg = packages.find(p => p.level_id === lid && p.quantity === levelSelectedQty);
    const nextPkgForLevel = _nextPkgByLevel.get(lid);
    return (
      <div key={level.id} className="module-level-section">
        <div className="module-level-header">
          <h3 className="module-level-title">{level.name}</h3>
          <span className="module-level-price">{fmt(level.price_brl)} / unidade</span>
          {level.description && <p className="module-level-desc">{level.description}</p>}
        </div>

        <div className="module-cards-grid">
          {mods.map(renderCard)}
        </div>

        {levelPkgs.length > 0 && (
          <div className="level-pkgs-block">
            <p className="level-pkgs-label">Pacotes com desconto neste nível</p>
            <div className="module-level-packages">
              {levelPkgs.map(p => {
                const saving = (p.quantity * level.price_brl) - p.price_brl;
                const isActive = matchedPkg?.id === p.id;
                return (
                  <span key={p.id} className={`level-pkg-chip${isActive ? ' active' : ''}`}>
                    Ativando {p.quantity} módulos → {fmt(p.price_brl)}
                    {saving > 0 && ` · Economize ${fmt(saving)}`}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {nextPkgForLevel && (
          <div className="module-summary-hint level-hint">
            💡 Adicione mais 1 módulo <strong>{level.name}</strong> e pague apenas <strong>{fmt(nextPkgForLevel.price_brl)}</strong> pelos {nextPkgForLevel.quantity} juntos!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modules-store">
      {modulesByLevel.map(({ level, mods }) => renderLevelSection(level, mods))}

      {noLevelMods.length > 0 && (
        <div className="module-level-section">
          <div className="module-level-header">
            <h3 className="module-level-title">Outros Módulos</h3>
          </div>
          <div className="module-cards-grid">
            {noLevelMods.map(renderCard)}
          </div>
        </div>
      )}

      {totalQty > 0 && (
        <div className="module-purchase-summary">
          <div className="module-summary-info">
            <span><strong>{totalQty}</strong> módulo{totalQty > 1 ? 's' : ''} selecionado{totalQty > 1 ? 's' : ''}</span>
            {currentPrice != null && (
              <span className="module-summary-price">{fmt(currentPrice)}</span>
            )}
          </div>
          <button className="store-card-btn module-buy-btn" onClick={handleBuy}>
            Ativar {totalQty} módulo{totalQty > 1 ? 's' : ''} — {currentPrice != null ? fmt(currentPrice) : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function StorePage() {
  const navigate = useNavigate();
  const { balances, costs } = useApp();
  const noBalance = balances.gold < costs.gold && balances.silver < costs.silver && balances.bronze < costs.bronze;

  const [hasFreeModules, setHasFreeModules] = useState(false);
  const [tab,    setTab]    = useState<StoreTab>('chests');
  const [chests, setChests] = useState<CoinChest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listChests(),
      listModules(),
    ])
      .then(([chestsRes, modsRes]) => {
        setChests(chestsRes.items);
        const hasFree = modsRes.items.some(
          m => m.is_active !== false && (m.module_type === 'free' || !m.module_type)
        );
        setHasFreeModules(hasFree);
        if (!hasFree) setTab('modules');
      })
      .catch(() => swal.error('Erro', 'Não foi possível carregar a loja.'))
      .finally(() => setLoading(false));
  }, []);

  const featuredIdx = Math.floor(chests.length / 2);

  return (
    <div className="store-page-inner">
        <div className="store-header">
          <h1 className="store-title">Módulos</h1>
          <p className="store-subtitle">Escolha os módulos que deseja ativar</p>
        </div>

        {/* Tabs */}
        <div className="store-tabs">
          {hasFreeModules && (
            <button
              className={`store-tab-btn${tab === 'chests' ? ' active' : ''}`}
              onClick={() => setTab('chests')}
            >
              🪙 Comprar Créditos (Baús)
            </button>
          )}
          <button
            className={`store-tab-btn${tab === 'modules' ? ' active' : ''}`}
            onClick={() => setTab('modules')}
          >
            📦 Ativar Módulos
          </button>
        </div>

        {/* Tab: Baús */}
        {tab === 'chests' && (
          <>
            <p className="store-subtitle" style={{ marginTop: 8, marginBottom: 16 }}>
              Adquira moedas para usar nos módulos de consulta livre
            </p>
            {noBalance && (
              <div className="store-no-balance-alert">
                ⚠️ Você não possui saldo disponível. Adquira um baú para continuar conversando.
              </div>
            )}
            {loading ? (
              <div className="store-loading">Carregando baús disponíveis...</div>
            ) : chests.length === 0 ? (
              <div className="store-empty">Nenhum baú disponível no momento.</div>
            ) : (
              <div className="store-grid">
                {chests.map((chest, i) => {
                  const cfg = COIN_CONFIG[chest.coin_type] ?? COIN_CONFIG.bronze;
                  const isFeatured = i === featuredIdx && chests.length > 1;
                  return (
                    <div key={chest.id} className={`store-card ${cfg.gradient} ${isFeatured ? 'store-card-featured' : ''}`}>
                      {isFeatured && <div className="store-card-badge">★ Mais Popular</div>}
                      <div className="store-card-icon-wrap">
                        {chest.image_url
                          ? <img src={chest.image_url} alt={chest.name} className="chest-custom-img" />
                          : <ChestSVG type={chest.coin_type} />}
                      </div>
                      <h2 className="store-card-name">{chest.name}</h2>
                      <p className="store-card-coin-label">Moedas de {cfg.label}</p>
                      <div className="store-card-price-wrap">
                        <span className="store-card-price">
                          {chest.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="store-card-period">por baú</span>
                      </div>
                      <ul className="store-card-features">
                        <li>
                          <span className="feature-check">✓</span>
                          {chest.coin_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} moedas de {cfg.label}
                        </li>
                        {cfg.features.map((f, fi) => (
                          <li key={fi}><span className="feature-check">✓</span> {f}</li>
                        ))}
                      </ul>
                      <button className="store-card-btn" onClick={() => navigate(`/checkout/${chest.id}`, { state: { chest } })}>
                        {cfg.btnLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Módulos */}
        {tab === 'modules' && <ModulesTab />}

        <p className="store-disclaimer">
          🔒 Ambiente de pagamento simulado · Nenhuma cobrança real será efetuada
        </p>
    </div>
  );
}
