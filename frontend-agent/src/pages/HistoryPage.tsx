// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { getTransactions, getModuleOrders } from '../api/balance';
import { listSessions } from '../api/sessions';
import { useApp } from '../context/AppContext';
import type { CoinTransactionItem, ModuleOrderItem } from '../api/balance';
import type { SessionListItem } from '../types';

const COIN_ICONS:  Record<string, string> = { gold: '🟡', silver: '⚪', bronze: '🟤' };
const COIN_LABELS: Record<string, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };
const TYPE_LABELS: Record<string, string> = { admin_credit: 'Crédito', message_debit: 'Débito', chest_purchase: 'Compra de Baú', module_purchase: 'Compra de Módulo' };

const TX_PAGE_SIZE  = 15;
const SES_PAGE_SIZE = 15;
const ORD_PAGE_SIZE = 15;

const PAY_ICONS: Record<string, string> = { credit_card: '💳', pix: '⚡', boleto: '📄' };

export default function HistoryPage() {
  const { user } = useApp();
  const [items,    setItems]    = useState<CoinTransactionItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [orders,   setOrders]   = useState<ModuleOrderItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sesLoad,  setSesLoad]  = useState(true);
  const [ordLoad,  setOrdLoad]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [sesSearch,setSesSearch]= useState('');
  const [ordSearch,setOrdSearch]= useState('');
  const [page,     setPage]     = useState(1);
  const [sesPage,  setSesPage]  = useState(1);
  const [ordPage,  setOrdPage]  = useState(1);

  useEffect(() => {
    getTransactions()
      .then(r => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    listSessions()
      .then(r => setSessions(r.items.filter(s => s.module_id != null)))
      .catch(() => setSessions([]))
      .finally(() => setSesLoad(false));

    getModuleOrders()
      .then(r => setOrders(r.items))
      .catch(() => setOrders([]))
      .finally(() => setOrdLoad(false));
  }, []);

  const filtered = items.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (t.description || '').toLowerCase().includes(q) ||
      (COIN_LABELS[t.coin_type || ''] || '').toLowerCase().includes(q) ||
      TYPE_LABELS[t.type]?.toLowerCase().includes(q) ||
      new Date(t.created_at).toLocaleString('pt-BR').includes(q)
    );
  });

  const filteredSes = sessions.filter(s => {
    const q = sesSearch.toLowerCase();
    if (!q) return true;
    return (
      (s.module_name || '').toLowerCase().includes(q) ||
      (s.child_name || '').toLowerCase().includes(q) ||
      (user?.full_name || '').toLowerCase().includes(q) ||
      (s.title || '').toLowerCase().includes(q) ||
      new Date(s.created_at || '').toLocaleString('pt-BR').includes(q)
    );
  });

  const filteredOrd = orders.filter(o => {
    const q = ordSearch.toLowerCase();
    if (!q) return true;
    return (
      o.payment_label.toLowerCase().includes(q) ||
      o.status_label.toLowerCase().includes(q) ||
      new Date(o.created_at).toLocaleString('pt-BR').includes(q)
    );
  });

  const totalPages    = Math.max(1, Math.ceil(filtered.length / TX_PAGE_SIZE));
  const pageItems     = filtered.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE);

  const sesTotalPages = Math.max(1, Math.ceil(filteredSes.length / SES_PAGE_SIZE));
  const sesPageItems  = filteredSes.slice((sesPage - 1) * SES_PAGE_SIZE, sesPage * SES_PAGE_SIZE);

  const ordTotalPages = Math.max(1, Math.ceil(filteredOrd.length / ORD_PAGE_SIZE));
  const ordPageItems  = filteredOrd.slice((ordPage - 1) * ORD_PAGE_SIZE, ordPage * ORD_PAGE_SIZE);

  return (
    <div className="history-page">
      <div className="history-container">
        <div className="profile-header">
          <h1 className="profile-title">Histórico de consumo</h1>
        </div>

        {/* ── Módulos iniciados ─────────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">📦</span>
            <div>
              <h2 className="profile-card-title">Módulos Iniciados</h2>
              <p className="profile-card-sub">Sessões de módulo abertas na sua conta</p>
            </div>
          </div>

          <div className="history-search">
            <input
              type="search"
              placeholder="Buscar por módulo, usuário..."
              value={sesSearch}
              onChange={e => { setSesSearch(e.target.value); setSesPage(1); }}
            />
          </div>

          {sesLoad ? (
            <p className="history-msg">Carregando...</p>
          ) : filteredSes.length === 0 ? (
            <p className="history-msg">Nenhum módulo iniciado.</p>
          ) : (
            <>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Data de Início</th>
                      <th>Módulo</th>
                      <th>Usuário</th>
                      <th>Última atualização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sesPageItems.map(s => (
                      <tr key={s.id}>
                        <td className="tx-date">
                          {s.created_at ? new Date(s.created_at).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.module_name || '—'}</td>
                        <td>{s.child_name || user?.full_name || '—'}</td>
                        <td className="tx-date">
                          {s.updated_at ? new Date(s.updated_at).toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sesTotalPages > 1 && (
                <div className="history-pages">
                  <button disabled={sesPage <= 1} onClick={() => setSesPage(p => p - 1)}>‹</button>
                  <span>{sesPage} / {sesTotalPages}</span>
                  <button disabled={sesPage >= sesTotalPages} onClick={() => setSesPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Pedidos de Módulos ───────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">📦</span>
            <div>
              <h2 className="profile-card-title">Ativação de Módulos</h2>
              <p className="profile-card-sub">Histórico de ativação de módulos realizadas</p>
            </div>
          </div>

          <div className="history-search">
            <input
              type="search"
              placeholder="Buscar por pagamento, status..."
              value={ordSearch}
              onChange={e => { setOrdSearch(e.target.value); setOrdPage(1); }}
            />
          </div>

          {ordLoad ? (
            <p className="history-msg">Carregando...</p>
          ) : filteredOrd.length === 0 ? (
            <p className="history-msg">Nenhum pedido de módulo encontrado.</p>
          ) : (
            <>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Data e Hora</th>
                      <th>Qtd. Módulos</th>
                      <th>Valor</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordPageItems.map(o => (
                      <tr key={o.id}>
                        <td className="tx-muted">#{o.id}</td>
                        <td className="tx-date">
                          {new Date(o.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          📦 {o.quantity} módulo{o.quantity !== 1 ? 's' : ''}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {o.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td>
                          {PAY_ICONS[o.payment_method] ?? ''} {o.payment_label}
                        </td>
                        <td>
                          <span className={`tx-badge tx-${o.status}`}>
                            {o.status_label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ordTotalPages > 1 && (
                <div className="history-pages">
                  <button disabled={ordPage <= 1} onClick={() => setOrdPage(p => p - 1)}>‹</button>
                  <span>{ordPage} / {ordTotalPages}</span>
                  <button disabled={ordPage >= ordTotalPages} onClick={() => setOrdPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Transações de moedas ──────────────────────────── */}
        {!loading && items.length > 0 && <section className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">📋</span>
            <div>
              <h2 className="profile-card-title">Transações</h2>
              <p className="profile-card-sub">Histórico completo de créditos e débitos</p>
            </div>
          </div>

          <div className="history-search">
            <input
              type="search"
              placeholder="Buscar por descrição, moeda, tipo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {loading ? (
            <p className="history-msg">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="history-msg">Nenhum registro encontrado.</p>
          ) : (
            <>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Data e Hora</th>
                      <th>Tipo</th>
                      <th>Moeda</th>
                      <th>Valor</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(t => (
                      <tr key={t.id}>
                        <td className="tx-date">
                          {new Date(t.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td>
                          <span className={`tx-badge tx-${t.type}`}>
                            {TYPE_LABELS[t.type]}
                          </span>
                        </td>
                        <td>
                          {t.coin_type
                            ? <span>{COIN_ICONS[t.coin_type]} {COIN_LABELS[t.coin_type]}</span>
                            : <span className="tx-muted">—</span>}
                        </td>
                        <td className={t.type === 'admin_credit' ? 'tx-pos' : 'tx-neg'}>
                          {t.type === 'admin_credit' ? '+' : '-'}
                          {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                        </td>
                        <td className="tx-desc">{t.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="history-pages">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  <span>{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </section>}
      </div>
    </div>
  );
}
