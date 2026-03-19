import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createAdminUser, getAdminUser, updateAdminUser } from '../../api/adminUsers';
import type { Permission } from '../../types';
import { swal } from '../../utils/swal';

const RESOURCES: Array<{ key: 'agente' | 'clientes' | 'usuarios' | 'cobranca'; label: string }> = [
  { key: 'agente',    label: 'Agente (Módulos)' },
  { key: 'clientes',  label: 'Clientes' },
  { key: 'usuarios',  label: 'Usuários Admin' },
  { key: 'cobranca',  label: 'Cobrança' },
];

interface PermState { can_insert: boolean; can_update: boolean; can_delete: boolean; }
type PermsMap = Record<string, PermState>;

const emptyPerms = (): PermsMap =>
  Object.fromEntries(RESOURCES.map(r => [r.key, { can_insert: false, can_update: false, can_delete: false }]));

export default function AdminUserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name,     setName]     = useState('');
  const [cpf,      setCpf]      = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [status,   setStatus]   = useState<'active' | 'inactive'>('active');
  const [perms,    setPerms]    = useState<PermsMap>(emptyPerms());
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getAdminUser(Number(id)).then(u => {
      setName(u.name);
      setCpf(u.cpf);
      setEmail(u.email);
      setStatus(u.status);
      const map = emptyPerms();
      u.permissions.forEach(p => {
        map[p.resource] = {
          can_insert: Boolean(p.can_insert),
          can_update: Boolean(p.can_update),
          can_delete: Boolean(p.can_delete),
        };
      });
      setPerms(map);
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const togglePerm = (resource: string, action: keyof PermState) => {
    setPerms(prev => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource][action] },
    }));
  };

  const buildPermissions = (): Partial<Permission>[] =>
    RESOURCES.map(r => ({
      resource: r.key,
      can_insert: perms[r.key].can_insert ? 1 : 0,
      can_update: perms[r.key].can_update ? 1 : 0,
      can_delete: perms[r.key].can_delete ? 1 : 0,
    }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, cpf, email, status, permissions: buildPermissions() };
      if (isEdit) {
        await updateAdminUser(Number(id), password ? { ...payload, password } : payload);
      } else {
        if (!password) {
          swal.warning('Campo obrigatório', 'Informe a senha para o novo usuário.');
          setSaving(false);
          return;
        }
        await createAdminUser({ ...payload, password });
      }
      await swal.success(isEdit ? 'Usuário atualizado!' : 'Usuário criado!');
      navigate('/usuarios');
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const fmtCpf = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
                 .replace(/(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3')
                 .replace(/(\d{3})(\d{1,3})$/, '$1.$2');
  };

  if (loading) return <Layout title={isEdit ? 'Editar Usuário' : 'Novo Usuário'}><p>Carregando...</p></Layout>;

  return (
    <Layout title={isEdit ? 'Editar Usuário Admin' : 'Incluir Usuário Admin'}>
      <div className="card" style={{ maxWidth: 700 }}>
        <div className="card-header">
          <h2>{isEdit ? 'Editar Usuário' : 'Incluir Usuário'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-form">

            <div className="form-row">
              <div className="form-group">
                <label>Nome Completo <span className="req">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>CPF <span className="req">*</span></label>
                <input
                  value={cpf}
                  onChange={e => setCpf(fmtCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email <span className="req">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Senha {!isEdit && <span className="req">*</span>}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isEdit ? 'Deixe em branco para não alterar' : 'Senha'}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            {/* Permissões */}
            <div className="perm-section">
              <h3 className="perm-title">Permissões por Módulo</h3>
              <table className="perm-table">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Inserir</th>
                    <th>Alterar</th>
                    <th>Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map(r => (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      {(['can_insert', 'can_update', 'can_delete'] as const).map(action => (
                        <td key={action} className="perm-check">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={perms[r.key][action]}
                              onChange={() => togglePerm(r.key, action)}
                            />
                            <span className="checkbox-custom" />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/usuarios')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
