import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import { listModuleLevels, toggleModuleLevel, deleteModuleLevel } from '../../api/modules';
import { swal } from '../../utils/swal';
import { useAuth } from '../../context/AuthContext';
import type { ModuleLevel } from '../../types';

const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ModuleLevelList() {
  const navigate = useNavigate();
  const { hasPerm } = useAuth();
  const canInsert = hasPerm('agente', 'insert');
  const canUpdate = hasPerm('agente', 'update');
  const canDelete = hasPerm('agente', 'delete');

  const [data, setData]       = useState<ModuleLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listModuleLevels().then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (l: ModuleLevel) => {
    const action = l.is_active ? 'Desativar' : 'Ativar';
    const ok = await swal.confirmToggle(`${action} nível?`, `Nível "${l.name}" será ${l.is_active ? 'desativado' : 'ativado'}.`);
    if (!ok) return;
    await toggleModuleLevel(l.id);
    load();
  };

  const handleDelete = async (l: ModuleLevel) => {
    const ok = await swal.confirm(`Excluir nível "${l.name}"?`, 'Esta ação não pode ser desfeita. Módulos vinculados perderão o nível.');
    if (!ok) return;
    try {
      await deleteModuleLevel(l.id);
      load();
    } catch (err: any) {
      swal.error('Erro', err.response?.data?.error || 'Não foi possível excluir.');
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Nome', sortable: true,
      render: row => <strong>{String(row.name)}</strong> },
    { key: 'slug', label: 'Slug', sortable: true,
      render: row => <code>{String(row.slug)}</code> },
    { key: 'description', label: 'Descrição', sortable: false,
      render: row => row.description ? String(row.description) : <em style={{ color: '#9ca3af' }}>—</em> },
    { key: 'price_brl', label: 'Preço', sortable: true,
      render: row => <strong>{fmt(Number(row.price_brl))}</strong> },
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
    <Layout title="Níveis de Módulos">
      <div className="card">
        <div className="card-header">
          <h2>Níveis de Módulos</h2>
          {canInsert && (
            <button className="btn btn-primary" onClick={() => navigate('/modulos/niveis/novo')}>
              + Novo Nível
            </button>
          )}
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const level = row as unknown as ModuleLevel;
              return (
                <div className="action-btns">
                  {canUpdate && (
                    <button
                      className="btn-icon btn-edit"
                      title="Editar"
                      onClick={() => navigate(`/modulos/niveis/${level.id}/editar`)}
                    >✎</button>
                  )}
                  {canUpdate && (
                    <button
                      className={`btn-icon ${level.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                      title={level.is_active ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggle(level)}
                    >{level.is_active ? '⏸' : '▶'}</button>
                  )}
                  {canDelete && (
                    <button
                      className="btn-icon btn-delete"
                      title="Excluir"
                      onClick={() => handleDelete(level)}
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
