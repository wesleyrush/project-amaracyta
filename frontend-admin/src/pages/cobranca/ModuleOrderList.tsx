import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { listModuleOrders, cancelModuleOrder } from '../../api/moduleOrders';
import { useAuth } from '../../context/AuthContext';
import type { ModuleOrder, OrderStatus } from '../../types';
import { swal } from '../../utils/swal';

const PAY_ICONS: Record<string, string> = { credit_card: '💳', pix: '⚡', boleto: '📄' };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Todos os status' },
  { value: 'completed',  label: 'Concluído' },
  { value: 'cancelled',  label: 'Cancelado' },
];

const PAGE_SIZE = 20;

export default function ModuleOrderList() {
  const { hasPerm } = useAuth();
  const canAct = hasPerm('cobranca', 'update');

  const [items,   setItems]   = useState<ModuleOrder[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listModuleOrders({ search, status, page, limit: PAGE_SIZE })
      .then(r => { setItems(r.items); setTotal(r.total); })
      .catch(() => swal.error('Erro', 'Não foi possível carregar os pedidos de módulos.'))
      .finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (order: ModuleOrder) => {
    const ok = await swal.confirm(
      'Cancelar pedido?',
      `O pedido #${order.id} de "${order.full_name ?? order.email}" será marcado como cancelado.`
    );
    if (!ok) return;
    try {
      await cancelModuleOrder(order.id);
      await swal.success('Pedido cancelado!', `Pedido #${order.id} cancelado com sucesso.`);
      load();
    } catch (err: any) {
      swal.error('Erro ao cancelar', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Layout title="Cobrança — Pedidos de Módulos">
      <div className="card">
        <div className="card-header">
          <h2>Pedidos de Módulos</h2>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{total} pedido{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="card-body">

          <div className="orders-filters">
            <input
              type="search"
              placeholder="Buscar por cliente ou e-mail..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>Carregando...</p>
          ) : items.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>Nenhum pedido encontrado.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="modal-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Data / Hora</th>
                      <th>Cliente</th>
                      <th>Qtd. Módulos</th>
                      <th>Valor</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                      {canAct && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(order => (
                      <tr key={order.id}>
                        <td style={{ color: '#9ca3af', fontSize: 12 }}>#{order.id}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {new Date(order.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{order.full_name ?? '—'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{order.email ?? '—'}</div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>
                          📦 {order.quantity} módulo{order.quantity !== 1 ? 's' : ''}
                        </td>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 13 }}>
                          {order.price_brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {PAY_ICONS[order.payment_method] ?? ''} {order.payment_label}
                        </td>
                        <td>
                          <span className={`order-status-${order.status as OrderStatus}`}>
                            {order.status_label}
                          </span>
                        </td>
                        {canAct && (
                          <td>
                            {order.status === 'completed' ? (
                              <div className="order-action-btns">
                                <button className="btn-cancel" onClick={() => handleCancel(order)} title="Cancelar pedido">
                                  ✕ Cancelar
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="orders-pagination">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  <span>Página {page} de {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
