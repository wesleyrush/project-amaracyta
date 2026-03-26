import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import { listChests, toggleChest, deleteChest } from '../../api/chests';
import { useAuth } from '../../context/AuthContext';
import type { CoinChest } from '../../types';
import { swal } from '../../utils/swal';

export default function ChestList() {
  const [data, setData] = useState<CoinChest[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPerm } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    listChests().then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (row: CoinChest) => {
    const action = row.status === 'active' ? 'desativar' : 'ativar';
    const ok = await swal.confirmToggle(`${action.charAt(0).toUpperCase() + action.slice(1)} baú?`, `O baú "${row.name}" será ${action === 'desativar' ? 'desativado' : 'ativado'}.`);
    if (!ok) return;
    await toggleChest(row.id);
    load();
  };

  const handleDelete = async (row: CoinChest) => {
    const ok = await swal.confirm('Excluir baú?', `"${row.name}" será excluído permanentemente.`);
    if (!ok) return;
    try {
      await deleteChest(row.id);
      swal.success('Baú excluído com sucesso.');
      load();
    } catch (err: any) {
      swal.error('Erro ao excluir', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id',          label: 'ID',         sortable: true },
    { key: 'name',        label: 'Nome',        sortable: true },
    { key: 'coin_amount', label: 'Moedas',      sortable: true,
      render: row => Number(row.coin_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 }) },
    { key: 'price_brl',   label: 'Preço (R$)',  sortable: true,
      render: row => Number(row.price_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { key: 'status', label: 'Status', sortable: true,
      render: row => (
        <span className={`badge ${row.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
          {row.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    { key: 'updated_at', label: 'Atualizado em', sortable: true,
      render: row => new Date(String(row.updated_at)).toLocaleDateString('pt-BR') },
  ];

  return (
    <Layout title="Cobrança — Baús de Moedas">
      <div className="card">
        <div className="card-header">
          <h2>Baús de Moedas</h2>
          {hasPerm('cobranca', 'insert') && (
            <button className="btn btn-primary" onClick={() => navigate('/cobranca/baus/novo')}>
              + Novo Baú
            </button>
          )}
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const chest = row as unknown as CoinChest;
              return (
                <div className="action-btns">
                  {hasPerm('cobranca', 'update') && (
                    <button className="btn-icon btn-edit" title="Editar"
                      onClick={() => navigate(`/cobranca/baus/${chest.id}/editar`)}>✎</button>
                  )}
                  {hasPerm('cobranca', 'update') && (
                    <button
                      className={`btn-icon ${chest.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                      title={chest.status === 'active' ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggle(chest)}
                    >{chest.status === 'active' ? '⏸' : '▶'}</button>
                  )}
                  {hasPerm('cobranca', 'delete') && (
                    <button className="btn-icon btn-delete" title="Excluir"
                      onClick={() => handleDelete(chest)}>🗑</button>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>
    </Layout>
  );
}
