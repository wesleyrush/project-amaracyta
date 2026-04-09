import { FormEvent, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { purchaseChest } from '../api/chests';
import type { CoinChest } from '../types';
import { swal } from '../utils/swal';

type PayMethod = 'credit_card' | 'pix' | 'boleto';

const COIN_ICONS: Record<string, string> = { gold: '🟡', silver: '⚪', bronze: '🟤' };
const COIN_LABELS: Record<string, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };

function fmtCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state: { chest: CoinChest } | null };
  const navigate = useNavigate();
  const { setBalances } = useApp();

  const chest = state?.chest;

  const [method, setMethod] = useState<PayMethod>('credit_card');
  const [processing, setProcessing] = useState(false);

  // Card fields (simulado)
  const [cardNum,  setCardNum]  = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [cvv,      setCvv]      = useState('');

  if (!chest) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <p className="checkout-err">Baú não encontrado. <button onClick={() => navigate('/store')}>Ir à loja</button></p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (processing) return;

    // Validações mínimas do cartão (campos simulados)
    if (method === 'credit_card') {
      if (cardNum.replace(/\s/g, '').length < 16) {
        swal.warning('Cartão inválido', 'Informe os 16 dígitos do cartão.');
        return;
      }
      if (!cardName.trim()) {
        swal.warning('Nome obrigatório', 'Informe o nome impresso no cartão.');
        return;
      }
      if (expiry.length < 5) {
        swal.warning('Validade inválida', 'Informe a validade no formato MM/AA.');
        return;
      }
      if (cvv.length < 3) {
        swal.warning('CVV inválido', 'Informe os 3 ou 4 dígitos do CVV.');
        return;
      }
    }

    setProcessing(true);
    // Simula delay de processamento
    await new Promise(r => setTimeout(r, 1800));

    try {
      const result = await purchaseChest(chest.id, method);
      setBalances({
        gold:   result.coins_gold,
        silver: result.coins_silver,
        bronze: result.coins_bronze,
      });
      navigate('/purchase-success', {
        state: {
          chestName:  result.chest_name,
          coinType:   result.coin_type,
          coinAmount: result.coin_amount,
          priceBrl:   result.price_brl,
          newBalances: {
            gold:   result.coins_gold,
            silver: result.coins_silver,
            bronze: result.coins_bronze,
          },
        },
        replace: true,
      });
    } catch (err: any) {
      swal.error('Pagamento falhou', err.response?.data?.detail || 'Tente novamente.');
      setProcessing(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-inner">
        <button className="store-back-btn" onClick={() => navigate('/store')}>
          ← Voltar à lista
        </button>

        <h1 className="checkout-title">Finalizar Ativação</h1>

        <div className="checkout-layout">
          {/* Resumo do pedido */}
          <div className="checkout-summary">
            <h3>Resumo do pedido</h3>
            <div className="checkout-summary-card">
              <div className="cs-icon">
                {COIN_ICONS[chest.coin_type]}
              </div>
              <div className="cs-info">
                <strong>{chest.name}</strong>
                <span>
                  {chest.coin_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} moedas de {COIN_LABELS[chest.coin_type]}
                </span>
              </div>
              <div className="cs-price">
                {chest.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{chest.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
            <p className="checkout-sim-notice">
              🔒 Pagamento 100% simulado — nenhuma cobrança real
            </p>
          </div>

          {/* Formulário de pagamento */}
          <form className="checkout-form" onSubmit={handleSubmit}>
            <h3>Método de pagamento</h3>

            <div className="pay-method-tabs">
              {(['credit_card', 'pix', 'boleto'] as PayMethod[]).map(m => (
                <button
                  key={m}
                  type="button"
                  className={`pay-method-tab ${method === m ? 'active' : ''}`}
                  onClick={() => setMethod(m)}
                >
                  {m === 'credit_card' && '💳 Cartão'}
                  {m === 'pix'         && '⚡ PIX'}
                  {m === 'boleto'      && '📄 Boleto'}
                </button>
              ))}
            </div>

            {method === 'credit_card' && (
              <div className="pay-card-fields">
                <div className="pay-field">
                  <label>Número do cartão</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNum}
                    onChange={e => setCardNum(fmtCard(e.target.value))}
                    maxLength={19}
                  />
                </div>
                <div className="pay-field">
                  <label>Nome no cartão</label>
                  <input
                    type="text"
                    placeholder="Nome como impresso no cartão"
                    value={cardName}
                    onChange={e => setCardName(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="pay-field-row">
                  <div className="pay-field">
                    <label>Validade</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/AA"
                      value={expiry}
                      onChange={e => setExpiry(fmtExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div className="pay-field">
                    <label>CVV</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="123"
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'pix' && (
              <div className="pay-pix">
                <div className="pay-pix-qr">
                  <div className="pix-qr-placeholder">
                    <span>⚡</span>
                    <small>QR Code simulado</small>
                  </div>
                </div>
                <p className="pay-pix-info">
                  Em um ambiente real, o QR Code PIX seria gerado aqui. Clique em "Confirmar ativaçãos" para simular a aprovação.
                </p>
              </div>
            )}

            {method === 'boleto' && (
              <div className="pay-boleto">
                <div className="pay-boleto-bar">
                  <span className="boleto-line">||||| ||| ||||| ||| ||||| ||| ||||</span>
                  <small>Código de barras simulado</small>
                </div>
                <p className="pay-boleto-info">
                  Em um ambiente real, o boleto seria gerado aqui. Clique em "Confirmar ativação" para simular a aprovação.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="checkout-pay-btn"
              disabled={processing}
            >
              {processing ? (
                <span className="checkout-processing">
                  <span className="checkout-spinner" /> Processando pagamento...
                </span>
              ) : (
                `Confirmar ativação · ${chest.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
