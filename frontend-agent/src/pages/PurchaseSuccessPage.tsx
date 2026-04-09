import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface ChestSuccessState {
  isModulePurchase?: false;
  chestName:  string;
  coinType:   'gold' | 'silver' | 'bronze';
  coinAmount: number;
  priceBrl:   number;
  newBalances: { gold: number; silver: number; bronze: number };
}

interface ModuleSuccessState {
  isModulePurchase: true;
  chestName:   string;
  priceBrl:    number;
  moduleNames: string[];
}

type SuccessState = ChestSuccessState | ModuleSuccessState;

const COIN_ICONS:  Record<string, string> = { gold: '🟡', silver: '⚪', bronze: '🟤' };
const COIN_LABELS: Record<string, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PurchaseSuccessPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: SuccessState | null };
  const { refreshUserModules } = useApp();

  useEffect(() => {
    if (!state) navigate('/store', { replace: true });
    if (state?.isModulePurchase) refreshUserModules().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, navigate]);

  if (!state) return null;

  if (state.isModulePurchase) {
    const { chestName, priceBrl, moduleNames } = state;
    return (
      <div className="success-page">
        <div className="success-inner">
          <div className="success-icon-wrap">
            <div className="success-icon">✓</div>
          </div>

          <h1 className="success-title">Módulos adquiridos!</h1>
          <p className="success-subtitle">
            Seus módulos foram liberados e já estão disponíveis para uso.
          </p>

          <div className="success-detail-card">
            <div className="sdc-row">
              <span className="sdc-label">Resumo</span>
              <strong className="sdc-value">{chestName}</strong>
            </div>
            <div className="sdc-row">
              <span className="sdc-label">Valor pago</span>
              <strong className="sdc-value">{fmt(priceBrl)}</strong>
            </div>
          </div>

          <div className="success-balance-card">
            <h3>Módulos liberados</h3>
            <div className="success-balance-items">
              {moduleNames.map((name, i) => (
                <div key={i} className="sb-item">
                  <span>📦</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="success-actions">
            <button className="success-btn-primary" onClick={() => navigate('/')}>
              Iniciar conversa
            </button>
            <button className="success-btn-secondary" onClick={() => navigate('/store')}>
              Voltar à lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { chestName, coinType, coinAmount, priceBrl, newBalances } = state;
  const hasGold   = newBalances.gold   > 0;
  const hasSilver = newBalances.silver > 0;
  const hasBronze = newBalances.bronze > 0;

  return (
    <div className="success-page">
      <div className="success-inner">
        <div className="success-icon-wrap">
          <div className="success-icon">✓</div>
        </div>

        <h1 className="success-title">Compra realizada!</h1>
        <p className="success-subtitle">
          Suas moedas foram creditadas na carteira com sucesso.
        </p>

        <div className="success-detail-card">
          <div className="sdc-row">
            <span className="sdc-label">Baú adquirido</span>
            <strong className="sdc-value">{chestName}</strong>
          </div>
          <div className="sdc-row">
            <span className="sdc-label">Moedas creditadas</span>
            <strong className="sdc-value">
              {COIN_ICONS[coinType]}{' '}
              {coinAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} de {COIN_LABELS[coinType]}
            </strong>
          </div>
          <div className="sdc-row">
            <span className="sdc-label">Valor pago</span>
            <strong className="sdc-value">{fmt(priceBrl)}</strong>
          </div>
        </div>

        <div className="success-balance-card">
          <h3>Seu saldo atual</h3>
          <div className="success-balance-items">
            {hasGold && (
              <div className="sb-item">
                <span>🟡</span>
                <span>{newBalances.gold.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Ouro</span>
              </div>
            )}
            {hasSilver && (
              <div className="sb-item">
                <span>⚪</span>
                <span>{newBalances.silver.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Prata</span>
              </div>
            )}
            {hasBronze && (
              <div className="sb-item">
                <span>🟤</span>
                <span>{newBalances.bronze.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Cobre</span>
              </div>
            )}
            {!hasGold && !hasSilver && !hasBronze && (
              <span className="sb-zero">✦ 0,00</span>
            )}
          </div>
        </div>

        <div className="success-actions">
          <button className="success-btn-primary" onClick={() => navigate('/')}>
            Voltar ao chat
          </button>
          <button className="success-btn-secondary" onClick={() => navigate('/store')}>
            Comprar mais moedas
          </button>
        </div>
      </div>
    </div>
  );
}
