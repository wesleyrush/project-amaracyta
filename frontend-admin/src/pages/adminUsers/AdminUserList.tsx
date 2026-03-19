import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import { listAdminUsers, toggleAdminUser, deleteAdminUser } from '../../api/adminUsers';
import { useAuth } from '../../context/AuthContext';
import type { AdminUserFull } from '../../types';
import { swal } from '../../utils/swal';

export default function AdminUserList() {
  const [data,    setData]    = useState<AdminUserFull[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasPerm } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    listAdminUsers().then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (row: AdminUserFull) => {
    const action = row.status === 'active' ? 'desativar' : 'ativar';
    const ok = await swal.confirmToggle(`${action.charAt(0).toUpperCase() + action.slice(1)} usuário?`, `O usuário "${row.name}" será ${action === 'desativar' ? 'desativado' : 'ativado'}.`);
    if (!ok) return;
    await toggleAdminUser(row.id);
    load();
  };

  const handleDelete = async (row: AdminUserFull) => {
    const ok = await swal.confirm('Excluir usuário?', `"${row.name}" será excluído permanentemente.`);
    if (!ok) return;
    try {
      await deleteAdminUser(row.id);
      swal.success('Usuário excluído com sucesso.');
      load();
    } catch (err: any) {
      swal.error('Erro ao excluir', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const permSummary = (user: AdminUserFull) => {
    return user.permissions.map(p => {
      const actions = [
        p.can_insert ? 'I' : '',
        p.can_update ? 'U' : '',
        p.can_delete ? 'D' : '',
      ].filter(Boolean).join('');
      return actions ? `${p.resource}(${actions})` : null;
    }).filter(Boolean).join(' | ') || 'Sem permissões';
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'id',    label: 'ID',    sortable: true },
    { key: 'name',  label: 'Nome',  sortable: true },
    { key: 'cpf',   label: 'CPF',   sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'status', label: 'Status', sortable: true,
      render: row => (
        <span className={`badge ${row.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
          {row.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'permissions', label: 'Permissões', sortable: false,
      render: row => <small className="perm-summary">{permSummary(row as AdminUserFull)}</small>,
    },
    {
      key: 'created_at', label: 'Criado em', sortable: true,
      render: row => new Date(String(row.created_at)).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <Layout title="Usuários Admin">
      <div className="card">
        <div className="card-header">
          <h2>Listar Usuários</h2>
          {hasPerm('usuarios', 'insert') && (
            <button className="btn btn-primary" onClick={() => navigate('/usuarios/novo')}>
              + Novo Usuário
            </button>
          )}
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={data as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const user = row as AdminUserFull;
              return (
                <div className="action-btns">
                  {hasPerm('usuarios', 'update') && (
                    <button className="btn-icon btn-edit" title="Editar"
                      onClick={() => navigate(`/usuarios/${user.id}/editar`)}>✎</button>
                  )}
                  {hasPerm('usuarios', 'update') && (
                    <button
                      className={`btn-icon ${user.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                      title={user.status === 'active' ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggle(user)}
                    >{user.status === 'active' ? '⏸' : '▶'}</button>
                  )}
                  {hasPerm('usuarios', 'delete') && (
                    <button className="btn-icon btn-delete" title="Excluir"
                      onClick={() => handleDelete(user)}>🗑</button>
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
