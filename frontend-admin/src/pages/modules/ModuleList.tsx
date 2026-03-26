import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import { listModules, toggleModule, deleteModule, getModule, listFlowSteps } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import type { Module } from '../../types';
import { swal } from '../../utils/swal';

export default function ModuleList() {
  const [data, setData]     = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPerm, hasResource } = useAuth();
  const canEditPrompts = hasResource('configuracoes');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    listModules().then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (row: Module) => {
    const action = row.is_active ? 'Desativar' : 'Ativar';
    const ok = await swal.confirmToggle(`${action} módulo?`, `O módulo "${row.name}" será ${row.is_active ? 'desativado' : 'ativado'}.`);
    if (!ok) return;
    await toggleModule(row.id);
    load();
  };

  const handleClone = async (row: Module) => {
    const ok = await swal.confirmAction(
      'Duplicar módulo?',
      `Será criada uma cópia de "${row.name}" com todos os passos do fluxo.`,
      'Sim, duplicar'
    );
    if (!ok) return;
    try {
      const [module, flowSteps] = await Promise.all([
        getModule(row.id),
        listFlowSteps(row.id),
      ]);
      navigate('/modulos/novo', { state: { cloneFrom: module, flowSteps } });
    } catch {
      swal.error('Erro', 'Não foi possível carregar os dados do módulo.');
    }
  };

  const handleDelete = async (row: Module) => {
    const ok = await swal.confirm('Excluir módulo?', `"${row.name}" será excluído permanentemente.`);
    if (!ok) return;
    try {
      await deleteModule(row.id);
      swal.success('Módulo excluído com sucesso.');
      load();
    } catch (err: any) {
      swal.error('Erro ao excluir', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id',    label: 'ID',    sortable: true },
    {
      key: 'image_svg', label: 'Imagem', sortable: false,
      render: row => {
        const img = row.image_svg as string | null;
        if (!img) return <span style={{ color: '#d1d5db' }}>—</span>;
        if (img.startsWith('http') || img.startsWith('/'))
          return <img src={img} alt="" style={{ height: 36, width: 36, objectFit: 'contain' }} />;
        return <span style={{ display: 'inline-block', height: 36, width: 36 }} dangerouslySetInnerHTML={{ __html: img }} />;
      },
    },
    { key: 'slug',  label: 'Slug',  sortable: true },
    { key: 'name',  label: 'Nome',  sortable: true },
    {
      key: 'module_type', label: 'Tipo', sortable: true,
      render: row => (
        <span className={`badge ${row.module_type === 'fixed' ? 'badge-user' : 'badge-assistant'}`}>
          {row.module_type === 'fixed' ? 'Valor Fixo' : 'Livre'}
        </span>
      ),
    },
    {
      key: 'price_brl', label: 'Preço (R$)', sortable: true,
      render: row => row.module_type === 'fixed' && row.price_brl != null
        ? Number(row.price_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—',
    },
    {
      key: 'description', label: 'Descrição', sortable: false,
      render: row => (
        <span className="text-truncate" title={String(row.description ?? '')}>
          {String(row.description ?? '-').slice(0, 60)}{(row.description as string)?.length > 60 ? '…' : ''}
        </span>
      ),
    },
    ...(canEditPrompts ? [{
      key: 'use_opening_prompt', label: 'Opening Prompt', sortable: true,
      render: (row: Record<string, unknown>) => (
        <span className={`badge ${row.use_opening_prompt ? 'badge-active' : 'badge-inactive'}`}>
          {row.use_opening_prompt ? 'Sim (IA)' : 'Não (welcome)'}
        </span>
      ),
    } as Column<Record<string, unknown>>] : []),
    {
      key: 'is_active', label: 'Status', sortable: true,
      render: row => (
        <span className={`badge ${row.is_active ? 'badge-active' : 'badge-inactive'}`}>
          {row.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Criado em', sortable: true,
      render: row => new Date(String(row.created_at)).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <Layout title="Módulos">
      <div className="card">
        <div className="card-header">
          <h2>Listar Módulos</h2>
          {hasPerm('agente', 'insert') && (
            <button className="btn btn-primary" onClick={() => navigate('/modulos/novo')}>
              + Novo Módulo
            </button>
          )}
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const m = row as unknown as Module;
              return (
              <div className="action-btns">
                {hasPerm('agente', 'update') && (
                  <button
                    className="btn-icon btn-edit"
                    title="Editar"
                    onClick={() => navigate(`/modulos/${m.id}/editar`)}
                  >✎</button>
                )}
                {hasPerm('agente', 'insert') && (
                  <button
                    className="btn-icon"
                    title="Duplicar"
                    style={{ color: '#7c3aed' }}
                    onClick={() => handleClone(m)}
                  >⧉</button>
                )}
                {hasPerm('agente', 'update') && (
                  <button
                    className={`btn-icon ${m.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                    title={m.is_active ? 'Desativar' : 'Ativar'}
                    onClick={() => handleToggle(m)}
                  >{m.is_active ? '⏸' : '▶'}</button>
                )}
                {hasPerm('agente', 'delete') && (
                  <button
                    className="btn-icon btn-delete"
                    title="Excluir"
                    onClick={() => handleDelete(m)}
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
