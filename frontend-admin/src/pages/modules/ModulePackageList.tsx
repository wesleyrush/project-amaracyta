import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';
import type { ModulePackage } from '../../types';
import { swal } from '../../utils/swal';
import api from '../../api/client';

const listPackages = () => api.get<{ items: ModulePackage[] }>('/module-packages').then(r => r.data.items);
const togglePackage = (id: number) => api.patch(`/module-packages/${id}/toggle`).then(r => r.data);
const deletePackage = (id: number) => api.delete(`/module-packages/${id}`).then(r => r.data);

export default function ModulePackageList() {
  const [data, setData]     = useState<ModulePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPerm } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    listPackages().then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (row: ModulePackage) => {
    const action = row.is_active ? 'Desativar' : 'Ativar';
    const ok = await swal.confirmToggle(`${action} pacote?`, `Pacote de ${row.quantity} módulo(s) será ${row.is_active ? 'desativado' : 'ativado'}.`);
    if (!ok) return;
    await togglePackage(row.id);
    load();
  };

  const handleDelete = async (row: ModulePackage) => {
    const ok = await swal.confirm('Excluir pacote?', `Pacote de ${row.quantity} módulo(s) será excluído permanentemente.`);
    if (!ok) return;
    try {
      await deletePackage(row.id);
      swal.success('Pacote excluído com sucesso.');
      load();
    } catch (err: any) {
      swal.error('Erro ao excluir', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id', label: 'ID', sortable: true },
    {
      key: 'level_name', label: 'Nível', sortable: true,
      render: row => row.level_name
        ? <strong>{String(row.level_name)}</strong>
        : <em style={{ color: '#9ca3af' }}>—</em>,
    },
    { key: 'quantity', label: 'Qtd. Módulos', sortable: true },
    {
      key: 'price_brl', label: 'Preço do Pacote', sortable: true,
      render: row => fmt(Number(row.price_brl)),
    },
    { key: 'description', label: 'Descrição', sortable: false,
      render: row => String(row.description ?? '-') },
    {
      key: 'is_active', label: 'Status', sortable: true,
      render: row => (
        <span className={`badge ${row.is_active ? 'badge-active' : 'badge-inactive'}`}>
          {row.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  return (
    <Layout title="Pacotes de Módulos">
      <div className="card">
        <div className="card-header">
          <h2>Pacotes de Módulos</h2>
          {hasPerm('agente', 'insert') && (
            <button className="btn btn-primary" onClick={() => navigate('/modulos/pacotes/novo')}>
              + Novo Pacote
            </button>
          )}
        </div>
        <div className="card-body">
          <p style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
            Defina preços especiais por quantidade de módulos de um determinado nível comprados juntos.
          </p>
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const pkg = row as unknown as ModulePackage;
              return (
              <div className="action-btns">
                {hasPerm('agente', 'update') && (
                  <button
                    className="btn-icon btn-edit"
                    title="Editar"
                    onClick={() => navigate(`/modulos/pacotes/${pkg.id}/editar`)}
                  >✎</button>
                )}
                {hasPerm('agente', 'update') && (
                  <button
                    className={`btn-icon ${pkg.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                    title={pkg.is_active ? 'Desativar' : 'Ativar'}
                    onClick={() => handleToggle(pkg)}
                  >{pkg.is_active ? '⏸' : '▶'}</button>
                )}
                {hasPerm('agente', 'delete') && (
                  <button
                    className="btn-icon btn-delete"
                    title="Excluir"
                    onClick={() => handleDelete(pkg)}
                  >🗑</button>
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
