// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { getTransactions } from '../api/balance';
import type { CoinTransactionItem } from '../api/balance';

const COIN_ICONS:  Record<string, string> = { gold: '🟡', silver: '⚪', bronze: '🟤' };
const COIN_LABELS: Record<string, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };
const TYPE_LABELS: Record<string, string> = { admin_credit: 'Crédito', message_debit: 'Débito', chest_purchase: 'Compra de Baú' };

const TX_PAGE_SIZE = 15;

export default function HistoryPage() {
  const [items,   setItems]   = useState<CoinTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    getTransactions()
      .then(r => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / TX_PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE);

  return (
    <div className="history-page">
      <div className="history-container">
        <div className="profile-header">
          <h1 className="profile-title">Histórico de consumo</h1>
        </div>

        <section className="profile-card">
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
        </section>
      </div>
    </div>
  );
}
