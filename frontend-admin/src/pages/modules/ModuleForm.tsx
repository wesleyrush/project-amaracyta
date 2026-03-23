import { FormEvent, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createModule, getModule, updateModule, listFlowSteps, createFlowStep, updateFlowStep, deleteFlowStep } from '../../api/modules';
import { swal } from '../../utils/swal';
import type { ModuleFlowStep } from '../../types';

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

// ─── Flow Step Modal ─────────────────────────────────────────────────────────

const EMPTY_STEP: Omit<ModuleFlowStep, 'id' | 'module_id' | 'created_at' | 'updated_at'> = {
  step_order: 1,
  label: '',
  button_label: '',
  prompt_template: '',
  include_user_profile: false,
  is_hidden: true,
};

interface FlowStepModalProps {
  step: typeof EMPTY_STEP | ModuleFlowStep;
  onSave: (data: typeof EMPTY_STEP) => Promise<void>;
  onClose: () => void;
}

function FlowStepModal({ step, onSave, onClose }: FlowStepModalProps) {
  const [form, setForm] = useState({ ...EMPTY_STEP, ...step });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY_STEP) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:10, padding:28, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <h3 style={{ marginTop:0 }}>Passo do Fluxo</h3>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Ordem (step_order) <span className="req">*</span></label>
              <input type="number" min={1} value={form.step_order}
                onChange={e => setForm(p => ({ ...p, step_order: Number(e.target.value) }))} required />
              <small>1 = primeiro passo após o opening prompt.</small>
            </div>
            <div className="form-group">
              <label>Descrição interna (label)</label>
              <input type="text" value={form.label ?? ''} onChange={set('label')}
                placeholder="Ex: Aceite da travessia" />
            </div>
          </div>

          <div className="form-group">
            <label>Texto do botão (button_label)</label>
            <input type="text" value={form.button_label ?? ''} onChange={set('button_label')}
              placeholder="Ex: Você aceita e permite essa travessia?" />
            <small>Botão exibido ao usuário para disparar este passo. Deixe vazio se o passo não precisa de botão.</small>
          </div>

          <div className="form-group">
            <label>Template do prompt</label>
            <textarea rows={10} className="system-prompt-area"
              value={form.prompt_template ?? ''} onChange={set('prompt_template')}
              placeholder="Ex: Nome Completo: {full_name}&#10;Data de Nascimento: {birth_date}&#10;..." />
            <small>
              Variáveis disponíveis: <code>{'{first}'}</code> <code>{'{full_name}'}</code> <code>{'{initiatic_name}'}</code>{' '}
              <code>{'{birth_date}'}</code> <code>{'{birth_time}'}</code> <code>{'{birth_location}'}</code>{' '}
              <code>{'{birth_city}'}</code> <code>{'{birth_state}'}</code> <code>{'{birth_country}'}</code>
            </small>
          </div>

          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.is_hidden}
                onChange={e => setForm(p => ({ ...p, is_hidden: e.target.checked }))} />
              Ocultar prompt da UI do chat
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.include_user_profile}
                onChange={e => setForm(p => ({ ...p, include_user_profile: e.target.checked }))} />
              Incluir perfil do usuário
            </label>
          </div>

          <div className="form-actions" style={{ marginTop:20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Passo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────────────────────

export default function ModuleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Flow steps state
  const [flowSteps, setFlowSteps] = useState<ModuleFlowStep[]>([]);
  const [flowModal, setFlowModal] = useState<{ open: boolean; editing: ModuleFlowStep | null }>({ open: false, editing: null });

  const loadFlowSteps = useCallback(() => {
    if (!id) return;
    listFlowSteps(Number(id)).then(setFlowSteps).catch(() => {});
  }, [id]);

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
    loadFlowSteps();
  }, [id, isEdit, loadFlowSteps]);

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

  // Flow step handlers
  const handleFlowSave = async (data: typeof EMPTY_STEP) => {
    const mid = Number(id);
    try {
      if (flowModal.editing) {
        await updateFlowStep(mid, flowModal.editing.id, data);
      } else {
        await createFlowStep(mid, data);
      }
      loadFlowSteps();
      setFlowModal({ open: false, editing: null });
    } catch (err: any) {
      swal.error('Erro', err.response?.data?.detail || 'Tente novamente.');
    }
  };

  const handleFlowDelete = async (step: ModuleFlowStep) => {
    const ok = await swal.confirm(`Remover passo ${step.step_order}?`);
    if (!ok) return;
    await deleteFlowStep(Number(id), step.id);
    loadFlowSteps();
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

      {/* ── Passos do Fluxo (apenas em edição) ─────────────────────────── */}
      {isEdit && (
        <div className="card" style={{ maxWidth: 800, marginTop: 24 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Passos do Fluxo</h2>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                Sequência de interações automáticas após o opening prompt.
                Use variáveis <code>{'{full_name}'}</code>, <code>{'{birth_date}'}</code>, etc. nos templates.
              </p>
            </div>
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}
              onClick={() => setFlowModal({ open: true, editing: null })}>
              + Novo Passo
            </button>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {flowSteps.length === 0 ? (
              <p style={{ padding: '20px 24px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
                Nenhum passo configurado. Clique em "+ Novo Passo" para adicionar.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 48 }} />
                    <col style={{ width: '22%' }} />
                    <col />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 110 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', paddingLeft: 16 }}>#</th>
                      <th>Descrição</th>
                      <th>Botão</th>
                      <th style={{ textAlign: 'center' }}>Oculto</th>
                      <th style={{ textAlign: 'center' }}>Perfil</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowSteps.map(fs => (
                      <tr key={fs.id}>
                        <td style={{ textAlign: 'center', paddingLeft: 16 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 26, height: 26, borderRadius: '50%',
                            background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 13,
                          }}>{fs.step_order}</span>
                        </td>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fs.label || <em style={{ color: '#9ca3af' }}>—</em>}
                        </td>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fs.button_label
                            ? <span style={{
                                display: 'inline-block', maxWidth: '100%', overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                background: '#f0fdf4', color: '#16a34a',
                                border: '1px solid #bbf7d0', borderRadius: 20,
                                padding: '2px 10px', fontSize: 12, fontWeight: 500,
                              }}>{fs.button_label}</span>
                            : <em style={{ color: '#9ca3af' }}>—</em>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {fs.is_hidden
                            ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}>✓</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {fs.include_user_profile
                            ? <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 16 }}>✓</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-btns">
                            <button className="btn-icon btn-edit" title="Editar"
                              onClick={() => setFlowModal({ open: true, editing: fs })}>✎</button>
                            <button className="btn-icon btn-delete" title="Excluir"
                              onClick={() => handleFlowDelete(fs)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {flowModal.open && (
        <FlowStepModal
          step={flowModal.editing ?? { ...EMPTY_STEP, step_order: (flowSteps.slice(-1)[0]?.step_order ?? 0) + 1 }}
          onSave={handleFlowSave}
          onClose={() => setFlowModal({ open: false, editing: null })}
        />
      )}
    </Layout>
  );
}
