import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createModule, getModule, updateModule } from '../../api/modules';
import { swal } from '../../utils/swal';

interface FormState {
  slug: string;
  name: string;
  description: string;
  image_svg: string;
  system_prompt: string;
  use_opening_prompt: boolean;
  opening_prompt: string;
  welcome_message: string;
  few_shot: string;
  module_type: 'free' | 'fixed';
  price_brl: string;
}

const empty: FormState = {
  slug: '',
  name: '',
  description: '',
  image_svg: '',
  system_prompt: '',
  use_opening_prompt: false,
  opening_prompt: '',
  welcome_message: '',
  few_shot: '',
  module_type: 'free',
  price_brl: '',
};

export default function ModuleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getModule(Number(id))
      .then(m => setForm({
        slug: m.slug,
        name: m.name,
        description: m.description ?? '',
        image_svg: m.image_svg ?? '',
        system_prompt: m.system_prompt,
        use_opening_prompt: m.use_opening_prompt ?? false,
        opening_prompt: m.opening_prompt ?? '',
        welcome_message: m.welcome_message ?? '',
        few_shot: m.few_shot ?? '',
        module_type: m.module_type ?? 'free',
        price_brl: m.price_brl != null ? String(m.price_brl) : '',
      }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateModule(Number(id), form);
      } else {
        await createModule(form);
      }
      await swal.success(isEdit ? 'Módulo atualizado!' : 'Módulo criado!');
      navigate('/modulos');
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title={isEdit ? 'Editar Módulo' : 'Novo Módulo'}><p>Carregando...</p></Layout>;

  return (
    <Layout title={isEdit ? 'Editar Módulo' : 'Novo Módulo'}>
      <div className="card" style={{ maxWidth: 800 }}>
        <div className="card-header">
          <h2>{isEdit ? 'Editar Módulo' : 'Incluir Módulo'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Slug <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="ex: jornada-akastica"
                  required
                  pattern="[a-z0-9\-]+"
                  title="Use apenas letras minúsculas, números e hífens"
                />
                <small>Identificador único. Use letras minúsculas e hífens.</small>
              </div>

              <div className="form-group">
                <label>Nome <span className="req">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Nome do módulo"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tipo de Módulo <span className="req">*</span></label>
              <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="module_type"
                    value="free"
                    checked={form.module_type === 'free'}
                    onChange={() => setForm(prev => ({ ...prev, module_type: 'free', price_brl: '' }))}
                  />
                  <span><strong>Livre</strong> — cobrado por mensagem (moedas)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="module_type"
                    value="fixed"
                    checked={form.module_type === 'fixed'}
                    onChange={() => setForm(prev => ({ ...prev, module_type: 'fixed' }))}
                  />
                  <span><strong>Valor Fixo</strong> — pago uma vez em R$, sem input do usuário</span>
                </label>
              </div>
            </div>

            {form.module_type === 'fixed' && (
              <div className="form-group">
                <label>Preço Individual (R$) <span className="req">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_brl}
                  onChange={set('price_brl')}
                  placeholder="Ex: 7.77"
                  required={form.module_type === 'fixed'}
                />
                <small>Preço unitário do módulo. Pode ser sobrescrito por pacotes de quantidade.</small>
              </div>
            )}

            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={set('description')}
                placeholder="Breve descrição do módulo"
              />
            </div>

            <div className="form-group">
              <label>Imagem SVG</label>
              <textarea
                value={form.image_svg}
                onChange={set('image_svg')}
                placeholder="Cole aqui o código SVG (ex: <svg ...>...</svg>)"
                rows={5}
                className="system-prompt-area"
              />
              {form.image_svg && (
                <div style={{ marginTop: 8, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, display: 'inline-block' }}>
                  <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Pré-visualização:</span>
                  <span dangerouslySetInnerHTML={{ __html: form.image_svg }} />
                </div>
              )}
              <small>Imagem exibida na seleção de módulo pelo cliente. Use SVG inline.</small>
            </div>

            <div className="form-group">
              <label>System Prompt <span className="req">*</span></label>
              <textarea
                value={form.system_prompt}
                onChange={set('system_prompt')}
                placeholder="Instruções de comportamento do agente para este módulo..."
                required
                rows={14}
                className="system-prompt-area"
              />
              <small>{form.system_prompt.length} caracteres</small>
            </div>

            <div className="form-group">
              <label className="form-check-label">
                <input
                  type="checkbox"
                  checked={form.use_opening_prompt}
                  onChange={e => setForm(prev => ({ ...prev, use_opening_prompt: e.target.checked }))}
                />
                Usar Opening Prompt (envia mensagem oculta à IA para gerar saudação)
              </label>
              <small>
                Quando ativado, a IA gera a mensagem de abertura. Quando desativado, exibe uma mensagem estática sem custo de moedas.
              </small>
            </div>

            {form.use_opening_prompt ? (
              <div className="form-group">
                <label>Opening Prompt</label>
                <textarea
                  value={form.opening_prompt}
                  onChange={set('opening_prompt')}
                  placeholder="Ex: Cumprimente {first} de forma calorosa e apresente o módulo..."
                  rows={5}
                  className="system-prompt-area"
                />
                <small>Use <code>{'{first}'}</code> para o primeiro nome do usuário. Esta mensagem é enviada à IA de forma oculta.</small>
              </div>
            ) : (
              <div className="form-group">
                <label>Mensagem de Abertura (Welcome Message)</label>
                <textarea
                  value={form.welcome_message}
                  onChange={set('welcome_message')}
                  placeholder={`Ex: Olá, {first}! Bem-vindo ao módulo. Como posso ajudar?`}
                  rows={4}
                  className="system-prompt-area"
                />
                <small>Exibida localmente sem chamar a IA. Use <code>{'{first}'}</code> para o primeiro nome do usuário.</small>
              </div>
            )}

            <div className="form-group">
              <label>Few-Shot (exemplos para o modelo)</label>
              <textarea
                value={form.few_shot}
                onChange={set('few_shot')}
                placeholder="Cole aqui exemplos de conversa para guiar o comportamento do modelo..."
                rows={8}
                className="system-prompt-area"
              />
              <small>{form.few_shot.length} caracteres</small>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/modulos')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Módulo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
