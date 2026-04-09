import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createModuleLevel, getModuleLevel, updateModuleLevel } from '../../api/modules';
import { swal } from '../../utils/swal';

interface FormState {
  slug: string;
  name: string;
  description: string;
  price_brl: string;
  is_active: boolean;
}

const empty: FormState = {
  slug: '',
  name: '',
  description: '',
  price_brl: '',
  is_active: true,
};

export default function ModuleLevelForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getModuleLevel(Number(id))
      .then(l => setForm({
        slug: l.slug,
        name: l.name,
        description: l.description ?? '',
        price_brl: String(l.price_brl),
        is_active: Boolean(l.is_active),
      }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        slug: form.slug,
        name: form.name,
        description: form.description || null,
        price_brl: Number(form.price_brl),
        is_active: form.is_active,
      };
      if (isEdit) {
        await updateModuleLevel(Number(id), payload);
      } else {
        await createModuleLevel(payload);
      }
      await swal.success(isEdit ? 'Nível atualizado!' : 'Nível criado!');
      navigate('/modulos/niveis');
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEdit ? 'Editar Nível' : 'Novo Nível';

  if (loading) return <Layout title={pageTitle}><p>Carregando...</p></Layout>;

  return (
    <Layout title={pageTitle}>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header"><h2>{pageTitle}</h2></div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Slug <span className="req">*</span></label>
                <input type="text" value={form.slug} onChange={set('slug')}
                  placeholder="ex: consciente" required pattern="[a-z0-9\-]+"
                  title="Use apenas letras minúsculas, números e hífens" />
                <small>Identificador único.</small>
              </div>
              <div className="form-group">
                <label>Nome <span className="req">*</span></label>
                <input type="text" value={form.name} onChange={set('name')}
                  placeholder="Ex: Consciente" required />
              </div>
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input type="text" value={form.description} onChange={set('description')}
                placeholder="Breve descrição do nível" />
            </div>

            <div className="form-group">
              <label>Preço (R$) <span className="req">*</span></label>
              <input type="number" min="0" step="0.01" value={form.price_brl} onChange={set('price_brl')}
                placeholder="Ex: 77.70" required />
              <small>Preço unitário aplicado a todos os módulos deste nível.</small>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} />
                Nível ativo
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/modulos/niveis')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Nível'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
