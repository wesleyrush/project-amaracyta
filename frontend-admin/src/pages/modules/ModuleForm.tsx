import { FormEvent, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createModule, getModule, updateModule, listFlowSteps, createFlowStep, updateFlowStep, deleteFlowStep, listModuleLevels } from '../../api/modules';
import { swal } from '../../utils/swal';
import { useAuth } from '../../context/AuthContext';
import type { ModuleFlowStep, ModuleLevel } from '../../types';

interface FormState {
  slug: string;
  name: string;
  description: string;
  image_svg: string;
  system_prompt: string;
  use_opening_prompt: boolean;
  show_opening_prompt: boolean;
  opening_prompt: string;
  welcome_message: string;
  few_shot: string;
  module_type: 'free' | 'fixed';
  level_id: string;
  life_category: string;
}

const LIFE_CATEGORY_OPTIONS = [
  { value: '',          label: '— Nenhuma (não gera vidas fora de Gaia) —' },
  { value: 'eu_sou',    label: '✦ EU SOU — usa vidas fora de Gaia já salvas (escolha livre do agente)' },
  { value: 'lyra',      label: 'Lyra (Lyriano) — gera 3 vidas em Lyra' },
  { value: 'pleiades',  label: 'Plêiades (Pleidiano) — gera 3 vidas nas Plêiades' },
  { value: 'sirius',    label: 'Sírius (Siriano) — gera 3 vidas em Sírius' },
  { value: 'orion',     label: 'Órion — gera 3 vidas em Órion' },
  { value: 'arcturus',  label: 'Arcturus (Arcturianos) — gera 3 vidas em Arcturus' },
  { value: 'andromeda', label: 'Andrômeda (Andromedano) — gera 3 vidas em Andrômeda' },
];

const empty: FormState = {
  slug: '',
  name: '',
  description: '',
  image_svg: '',
  system_prompt: '',
  use_opening_prompt: false,
  show_opening_prompt: false,
  opening_prompt: '',
  welcome_message: '',
  few_shot: '',
  module_type: 'free',
  level_id: '',
  life_category: '',
};

// ─── Flow Step Modal ─────────────────────────────────────────────────────────

const EMPTY_STEP: Omit<ModuleFlowStep, 'id' | 'module_id' | 'created_at' | 'updated_at'> = {
  step_order: 1,
  label: '',
  button_label: '',
  button_response: '',
  prompt_template: '',
  step_system_prompt: '',
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
            <label>Pergunta do agente / Texto do botão (button_label)</label>
            <input type="text" value={form.button_label ?? ''} onChange={set('button_label')}
              placeholder="Ex: Você aceita e permite essa travessia?" />
            <small>Aparece como botão e, após o clique, como bubble do agente no chat.</small>
          </div>

          <div className="form-group">
            <label>Resposta do usuário (button_response)</label>
            <input type="text" value={form.button_response ?? ''} onChange={set('button_response')}
              placeholder="Ex: Sim, eu aceito e permito essa travessia" />
            <small>Texto exibido como bubble do usuário após clicar no botão. Se vazio, usa o mesmo texto do botão.</small>
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

          <div className="form-group">
            <label>System Prompt do Passo <span style={{ fontWeight:400, color:'#6b7280', fontSize:12 }}>(sobrescreve o System Prompt do módulo neste passo)</span></label>
            <textarea rows={8} className="system-prompt-area"
              value={form.step_system_prompt ?? ''} onChange={set('step_system_prompt')}
              placeholder="Instrução rígida de formato para este passo específico. Se vazio, usa o System Prompt do módulo." />
            <small>Use para impor estrutura estrita na resposta (ex.: obrigar a resposta em seções específicas, proibir desvios, etc.).</small>
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
  const location = useLocation();
  const { hasResource } = useAuth();
  const canEditPrompts = hasResource('configuracoes');
  const cloneState = location.state as { cloneFrom?: import('../../types').Module; flowSteps?: ModuleFlowStep[] } | null;

  const [form, setForm] = useState<FormState>(empty);
  const [levels,    setLevels]    = useState<ModuleLevel[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  // Flow steps state
  const [flowSteps, setFlowSteps] = useState<ModuleFlowStep[]>([]);
  const [flowModal, setFlowModal] = useState<{ open: boolean; editing: ModuleFlowStep | null }>({ open: false, editing: null });

  const loadFlowSteps = useCallback(() => {
    if (!id) return;
    listFlowSteps(Number(id)).then(setFlowSteps).catch(() => {});
  }, [id]);

  useEffect(() => {
    listModuleLevels().then(setLevels).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) {
      if (cloneState?.cloneFrom) {
        const m = cloneState.cloneFrom;
        setForm({
          slug: `${m.slug}-copia`,
          name: `${m.name} (Cópia)`,
          description: m.description ?? '',
          image_svg: m.image_svg ?? '',
          system_prompt: m.system_prompt,
          use_opening_prompt: m.use_opening_prompt ?? false,
          show_opening_prompt: m.show_opening_prompt ?? false,
          opening_prompt: m.opening_prompt ?? '',
          welcome_message: m.welcome_message ?? '',
          few_shot: m.few_shot ?? '',
          module_type: m.module_type ?? 'free',
          level_id: m.level_id != null ? String(m.level_id) : '',
          life_category: m.life_category ?? '',
        });
      }
      return;
    }
    setLoading(true);
    getModule(Number(id))
      .then(m => setForm({
        slug: m.slug,
        name: m.name,
        description: m.description ?? '',
        image_svg: m.image_svg ?? '',
        system_prompt: m.system_prompt,
        use_opening_prompt: m.use_opening_prompt ?? false,
        show_opening_prompt: m.show_opening_prompt ?? false,
        opening_prompt: m.opening_prompt ?? '',
        welcome_message: m.welcome_message ?? '',
        few_shot: m.few_shot ?? '',
        module_type: m.module_type ?? 'free',
        level_id: m.level_id != null ? String(m.level_id) : '',
        life_category: m.life_category ?? '',
      }))
      .finally(() => setLoading(false));
    loadFlowSteps();
  }, [id, isEdit, loadFlowSteps]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const r = await fetch('/api/upload/module-image', { method: 'POST', credentials: 'include', body: data });
      if (!r.ok) throw new Error((await r.json()).error || 'Erro no upload');
      const { url } = await r.json();
      setForm(prev => ({ ...prev, image_svg: url }));
    } catch (err: any) {
      swal.error('Erro no upload', err.message);
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        level_id: form.level_id ? Number(form.level_id) : null,
        life_category: form.life_category || null,
      };
      if (isEdit) {
        await updateModule(Number(id), payload);
      } else {
        const created = await createModule(payload);
        const stepsToClone = cloneState?.flowSteps ?? [];
        for (const step of stepsToClone) {
          await createFlowStep(created.id, {
            step_order: step.step_order,
            label: step.label,
            button_label: step.button_label,
            button_response: step.button_response,
            prompt_template: step.prompt_template,
            step_system_prompt: step.step_system_prompt,
            include_user_profile: step.include_user_profile,
            is_hidden: step.is_hidden,
          });
        }
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

  const pageTitle = isEdit ? 'Editar Módulo' : cloneState?.cloneFrom ? 'Duplicar Módulo' : 'Novo Módulo';
  const formTitle = isEdit ? 'Editar Módulo' : cloneState?.cloneFrom ? `Duplicar: ${cloneState.cloneFrom.name}` : 'Incluir Módulo';

  if (loading) return <Layout title={pageTitle}><p>Carregando...</p></Layout>;

  return (
    <Layout title={pageTitle}>
      <div className="card" style={{ maxWidth: 800 }}>
        <div className="card-header">
          <h2>{formTitle}</h2>
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
                <label>Nível do Módulo <span className="req">*</span></label>
                <select
                  value={form.level_id}
                  onChange={e => setForm(prev => ({ ...prev, level_id: e.target.value }))}
                  required={form.module_type === 'fixed'}
                >
                  <option value="">Selecione um nível...</option>
                  {levels.filter(l => l.is_active).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} — R$ {Number(l.price_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                <small>O preço do módulo é definido pelo nível. Gerencie os níveis em <strong>Módulos → Níveis</strong>.</small>
              </div>
            )}

            <div className="form-group">
              <label>Categoria de Vida Fora de Gaia</label>
              <select
                value={form.life_category}
                onChange={e => setForm(prev => ({ ...prev, life_category: e.target.value }))}
              >
                {LIFE_CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <small>
                Define qual localização fora de Gaia este módulo gera e persiste (3 vidas).
                Usado para garantir consistência entre módulos do mesmo usuário.
                O módulo avançado futuro usará 1 vida de cada localização.
              </small>
            </div>

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
              <label>Imagem do Módulo</label>
              {form.image_svg && (
                <div style={{ marginBottom: 10, padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Pré-visualização:</span>
                  {form.image_svg.startsWith('http') || form.image_svg.startsWith('/')
                    ? <img src={form.image_svg} alt="imagem do módulo" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain' }} />
                    : <span dangerouslySetInnerHTML={{ __html: form.image_svg }} />
                  }
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => imageRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Enviando…' : form.image_svg ? '🔄 Trocar imagem' : '📤 Upload de imagem'}
                </button>
                {form.image_svg && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#dc2626' }}
                    onClick={() => setForm(prev => ({ ...prev, image_svg: '' }))}
                  >
                    🗑 Remover
                  </button>
                )}
                <input
                  ref={imageRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </div>
              <small style={{ marginTop: 6, display: 'block' }}>PNG, JPG, WebP, GIF ou SVG · máx. 2 MB. Exibida na seleção de módulo pelo cliente.</small>
            </div>

            {canEditPrompts && (
              <>
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

                {form.use_opening_prompt && (
                  <div className="form-group">
                    <label className="form-check-label">
                      <input
                        type="checkbox"
                        checked={form.show_opening_prompt}
                        onChange={e => setForm(prev => ({ ...prev, show_opening_prompt: e.target.checked }))}
                      />
                      Exibir Opening Prompt na área de mensagens do usuário
                    </label>
                    <small>
                      Quando marcado, o texto do Opening Prompt aparece como uma mensagem do usuário no chat. Por padrão fica oculto (mensagem técnica invisível).
                    </small>
                  </div>
                )}

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
              </>
            )}

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

      {/* ── Passos do Fluxo (apenas em edição + permissão configuracoes) ── */}
      {isEdit && canEditPrompts && (
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
