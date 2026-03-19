import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { swal } from '../../utils/swal';
import api from '../../api/client';
import type { ModulePackage } from '../../types';

const getPackage  = (id: number) => api.get<ModulePackage>(`/module-packages/${id}`).then(r => r.data);
const createPkg   = (data: object) => api.post('/module-packages', data).then(r => r.data);
const updatePkg   = (id: number, data: object) => api.put(`/module-packages/${id}`, data).then(r => r.data);

interface FormState {
  quantity: string;
  price_brl: string;
  description: string;
  is_active: boolean;
}

const empty: FormState = { quantity: '', price_brl: '', description: '', is_active: true };

export default function ModulePackageForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]     = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getPackage(Number(id))
      .then(p => setForm({
        quantity:    String(p.quantity),
        price_brl:   String(p.price_brl),
        description: p.description ?? '',
        is_active:   Boolean(p.is_active),
      }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        quantity:    Number(form.quantity),
        price_brl:   parseFloat(form.price_brl),
        description: form.description || null,
        is_active:   form.is_active,
      };
      if (isEdit) {
        await updatePkg(Number(id), payload);
      } else {
        await createPkg(payload);
      }
      await swal.success(isEdit ? 'Pacote atualizado!' : 'Pacote criado!');
      navigate('/modulos/pacotes');
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title={isEdit ? 'Editar Pacote' : 'Novo Pacote'}><p>Carregando...</p></Layout>;

  return (
    <Layout title={isEdit ? 'Editar Pacote' : 'Novo Pacote'}>
      <div className="card" style={{ maxWidth: 520 }}>
        <div className="card-header">
          <h2>{isEdit ? 'Editar Pacote de Módulos' : 'Novo Pacote de Módulos'}</h2>
        </div>
        <div className="card-body">
          <p style={{ marginBottom: 16, color: '#6b7280', fontSize: 14 }}>
            Defina um preço diferenciado para quando o cliente comprar N módulos fixos juntos.
          </p>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Quantidade de Módulos <span className="req">*</span></label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={set('quantity')}
                  placeholder="Ex: 2"
                  required
                />
                <small>Número de módulos comprados juntos para aplicar esse preço.</small>
              </div>
              <div className="form-group">
                <label>Preço do Pacote (R$) <span className="req">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_brl}
                  onChange={set('price_brl')}
                  placeholder="Ex: 9.99"
                  required
                />
                <small>Valor total cobrado por esse pacote.</small>
              </div>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={set('description')}
                placeholder="Ex: Pacote Duplo — Economize R$5,55"
              />
            </div>

            <div className="form-group">
              <label className="form-check-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                Pacote ativo (visível para clientes)
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/modulos/pacotes')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Pacote'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
