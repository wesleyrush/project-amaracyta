// src/pages/ChildrenPage.tsx
import { useEffect, useState } from 'react';
import { listChildren, createChild, updateChild, deleteChild } from '../api/children';
import type { Child } from '../types';
import { swal } from '../utils/swal';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

interface ChildFormData {
  full_name: string;
  initiatic_name: string;
  birth_date: string;
  birth_time: string;
  birth_country: string;
  birth_state: string;
  birth_city: string;
}

const emptyForm = (): ChildFormData => ({
  full_name: '', initiatic_name: '', birth_date: '', birth_time: '',
  birth_country: '', birth_state: '', birth_city: '',
});

function ChildForm({
  initial, onSave, onCancel, saving,
}: {
  initial: ChildFormData;
  onSave: (data: ChildFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const isBrazil = form.birth_country.trim().toLowerCase() === 'brasil';

  function set(k: keyof ChildFormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function handleCountryChange(v: string) {
    setForm(f => ({ ...f, birth_country: v, birth_state: '' }));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { swal.error('Campo obrigatório', 'Informe o nome do filho(a).'); return; }
    onSave(form);
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <label className="profile-label">
        <span>Nome Completo <span className="profile-req">*</span></span>
        <input type="text" className="profile-input" required
          value={form.full_name} onChange={e => set('full_name', e.target.value)}
          placeholder="Nome do filho(a)" />
      </label>
      <label className="profile-label">
        <span>Nome Iniciático <span className="profile-opt">(opcional)</span></span>
        <input type="text" className="profile-input"
          value={form.initiatic_name} onChange={e => set('initiatic_name', e.target.value)}
          placeholder="Ex.: Zephyrion Arcturiano" />
      </label>
      <div className="profile-field-row">
        <label className="profile-label">
          <span>Data de Nascimento</span>
          <input type="date" className="profile-input"
            value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
        </label>
        <label className="profile-label">
          <span>Hora de Nascimento</span>
          <input type="time" className="profile-input"
            value={form.birth_time} onChange={e => set('birth_time', e.target.value)} />
        </label>
      </div>
      <label className="profile-label">
        <span>País de Nascimento</span>
        <input type="text" className="profile-input"
          placeholder="Ex.: Brasil, Portugal…"
          value={form.birth_country} onChange={e => handleCountryChange(e.target.value)} />
      </label>
      <div className="profile-field-row">
        <label className="profile-label">
          <span>Estado</span>
          {isBrazil ? (
            <select className="profile-input"
              value={form.birth_state} onChange={e => set('birth_state', e.target.value)}>
              <option value="">Selecione…</option>
              {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input type="text" className="profile-input" placeholder="Estado / Província"
              value={form.birth_state} onChange={e => set('birth_state', e.target.value)} />
          )}
        </label>
        <label className="profile-label">
          <span>Cidade</span>
          <input type="text" className="profile-input" placeholder="Cidade"
            value={form.birth_city} onChange={e => set('birth_city', e.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="children-cancel-btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="profile-btn-primary" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    listChildren().then(r => setChildren(r.items)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleAdd(data: ChildFormData) {
    setSaving(true);
    try {
      await createChild({
        full_name:      data.full_name.trim(),
        initiatic_name: data.initiatic_name.trim() || null,
        birth_date:     data.birth_date || null,
        birth_time:     data.birth_time || null,
        birth_country:  data.birth_country.trim() || null,
        birth_state:    data.birth_state.trim() || null,
        birth_city:     data.birth_city.trim() || null,
      });
      setAdding(false);
      load();
      swal.success('Filho(a) cadastrado(a)!');
    } catch {
      swal.error('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally { setSaving(false); }
  }

  async function handleEdit(id: number, data: ChildFormData) {
    setSaving(true);
    try {
      await updateChild(id, {
        full_name:      data.full_name.trim(),
        initiatic_name: data.initiatic_name.trim() || null,
        birth_date:     data.birth_date || null,
        birth_time:     data.birth_time || null,
        birth_country:  data.birth_country.trim() || null,
        birth_state:    data.birth_state.trim() || null,
        birth_city:     data.birth_city.trim() || null,
      });
      setEditId(null);
      load();
      swal.success('Dados atualizados!');
    } catch {
      swal.error('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally { setSaving(false); }
  }

  async function handleDelete(child: Child) {
    const ok = await swal.confirm('Excluir filho(a)?', `"${child.full_name}" será removido(a) da sua conta.`);
    if (!ok) return;
    try {
      await deleteChild(child.id);
      load();
    } catch {
      swal.error('Erro', 'Não foi possível remover. Tente novamente.');
    }
  }

  function childToForm(c: Child): ChildFormData {
    return {
      full_name:      c.full_name,
      initiatic_name: c.initiatic_name ?? '',
      birth_date:     c.birth_date ?? '',
      birth_time:     c.birth_time ?? '',
      birth_country:  c.birth_country ?? '',
      birth_state:    c.birth_state ?? '',
      birth_city:     c.birth_city ?? '',
    };
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Filhos</h1>
      </div>

      <section className="profile-card">
        <div className="profile-card-head" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span className="profile-card-icon">👶</span>
            <div>
              <h2 className="profile-card-title">Cadastrar filho(a)</h2>
              <p className="profile-card-sub">Adicione e gerencie os filhos vinculados à sua conta</p>
            </div>
          </div>
          {!adding && (
            <button className="profile-btn-primary" style={{ flexShrink: 0 }}
              onClick={() => { setAdding(true); setEditId(null); }}>
              + Adicionar
            </button>
          )}
        </div>

        {adding && (
          <div className="children-form-section">
            <h3 className="children-form-title">Novo filho(a)</h3>
            <ChildForm initial={emptyForm()} onSave={handleAdd}
              onCancel={() => setAdding(false)} saving={saving} />
          </div>
        )}
      </section>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>Carregando…</p>
      ) : children.length === 0 && !adding ? (
        <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
          Nenhum filho(a) cadastrado(a) ainda.
        </p>
      ) : (
        children.map(child => (
          <section key={child.id} className="profile-card">
            {editId === child.id ? (
              <>
                <h3 className="children-form-title">Editar: {child.full_name}</h3>
                <ChildForm initial={childToForm(child)}
                  onSave={data => handleEdit(child.id, data)}
                  onCancel={() => setEditId(null)} saving={saving} />
              </>
            ) : (
              <div className="children-item">
                <div className="children-item-info">
                  <span className="children-item-avatar">👤</span>
                  <div>
                    <div className="children-item-name">{child.full_name}</div>
                    {child.initiatic_name && (
                      <div className="children-item-sub">Nome Iniciático: {child.initiatic_name}</div>
                    )}
                    {child.birth_date && (
                      <div className="children-item-sub">
                        Nascimento: {String(child.birth_date).slice(0, 10).split('-').reverse().join('/')}
                        {child.birth_time ? ` às ${child.birth_time}` : ''}
                      </div>
                    )}
                    {child.birth_city && (
                      <div className="children-item-sub">
                        Local: {[child.birth_city, child.birth_state, child.birth_country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="children-item-actions">
                  <button className="children-edit-btn"
                    onClick={() => { setEditId(child.id); setAdding(false); }}>
                    ✎ Editar
                  </button>
                  <button className="children-delete-btn" onClick={() => handleDelete(child)}>
                    🗑 Remover
                  </button>
                </div>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
