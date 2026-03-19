import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { purchaseModules } from '../api/modules';
import type { Module } from '../types';
import { swal } from '../utils/swal';

type PayMethod = 'credit_card' | 'pix' | 'boleto';

function fmtCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function ModuleCheckoutPage() {
  const { state } = useLocation() as {
    state: { moduleQuantities: Record<number, number>; modules: Module[]; price: number } | null;
  };
  const navigate = useNavigate();

  const [method,   setMethod]   = useState<PayMethod>('credit_card');
  const [processing, setProcessing] = useState(false);
  const [cardNum,  setCardNum]  = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [cvv,      setCvv]      = useState('');

  if (!state?.moduleQuantities || Object.keys(state.moduleQuantities).length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <p className="checkout-err">
            Nenhum módulo selecionado.{' '}
            <button onClick={() => navigate('/store')}>Ir à loja</button>
          </p>
        </div>
      </div>
    );
  }

  const { moduleQuantities, modules, price } = state;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (processing) return;

    if (method === 'credit_card') {
      if (cardNum.replace(/\s/g, '').length < 16) { swal.warning('Cartão inválido', 'Informe os 16 dígitos.'); return; }
      if (!cardName.trim()) { swal.warning('Nome obrigatório', 'Informe o nome no cartão.'); return; }
      if (expiry.length < 5) { swal.warning('Validade inválida', 'Formato MM/AA.'); return; }
      if (cvv.length < 3) { swal.warning('CVV inválido', 'Informe 3 ou 4 dígitos.'); return; }
    }

    setProcessing(true);
    await new Promise(r => setTimeout(r, 1800));

    try {
      const result = await purchaseModules(moduleQuantities, method);
      navigate('/purchase-success', {
        state: {
          chestName:  `${result.quantity} módulo${result.quantity > 1 ? 's' : ''} adquirido${result.quantity > 1 ? 's' : ''}`,
          coinType:   null,
          coinAmount: null,
          priceBrl:   result.price_brl,
          isModulePurchase: true,
          moduleNames: result.modules.map(m => m.name),
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
          ← Voltar à loja
        </button>

        <h1 className="checkout-title">Finalizar Compra — Módulos</h1>

        <div className="checkout-layout">
          {/* Resumo */}
          <div className="checkout-summary">
            <h3>Resumo do pedido</h3>
            {modules.map(m => {
              const qty = moduleQuantities[m.id] ?? 1;
              const linePrice = m.price_brl != null ? m.price_brl * qty : null;
              return (
                <div key={m.id} className="checkout-summary-card" style={{ marginBottom: 8 }}>
                  <div className="cs-icon">📦</div>
                  <div className="cs-info">
                    <strong>{m.name} × {qty}</strong>
                    <span>{m.description ?? 'Módulo de valor fixo'}</span>
                  </div>
                  <div className="cs-price">
                    {linePrice != null ? fmt(linePrice) : '—'}
                  </div>
                </div>
              );
            })}
            <div className="checkout-total">
              <span>Total</span>
              <strong>{fmt(price)}</strong>
            </div>
            {modules.length > 1 && (
              <div style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>
                🎉 Preço de pacote aplicado!
              </div>
            )}
            <p className="checkout-sim-notice">
              🔒 Pagamento 100% simulado — nenhuma cobrança real
            </p>
          </div>

          {/* Formulário */}
          <form className="checkout-form" onSubmit={handleSubmit}>
            <h3>Método de pagamento</h3>

            <div className="pay-method-tabs">
              {(['credit_card', 'pix', 'boleto'] as PayMethod[]).map(m => (
                <button key={m} type="button"
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
                  <input type="text" inputMode="numeric" placeholder="0000 0000 0000 0000"
                    value={cardNum} onChange={e => setCardNum(fmtCard(e.target.value))} maxLength={19} />
                </div>
                <div className="pay-field">
                  <label>Nome no cartão</label>
                  <input type="text" placeholder="Nome como impresso no cartão"
                    value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} />
                </div>
                <div className="pay-field-row">
                  <div className="pay-field">
                    <label>Validade</label>
                    <input type="text" inputMode="numeric" placeholder="MM/AA"
                      value={expiry} onChange={e => setExpiry(fmtExpiry(e.target.value))} maxLength={5} />
                  </div>
                  <div className="pay-field">
                    <label>CVV</label>
                    <input type="text" inputMode="numeric" placeholder="123"
                      value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
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
                  Em um ambiente real, o QR Code PIX seria gerado aqui. Clique em "Confirmar" para simular.
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
                  Em um ambiente real, o boleto seria gerado aqui. Clique em "Confirmar" para simular.
                </p>
              </div>
            )}

            <button type="submit" className="checkout-pay-btn" disabled={processing}>
              {processing ? (
                <span className="checkout-processing">
                  <span className="checkout-spinner" /> Processando pagamento...
                </span>
              ) : (
                `Confirmar pagamento · ${fmt(price)}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
