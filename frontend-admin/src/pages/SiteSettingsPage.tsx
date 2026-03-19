import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Swal from 'sweetalert2';

interface Settings {
  site_title: string;
  logo_url: string;
  logo_svg: string;
}

const API = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  if (!r.ok) throw new Error((await r.json()).error || 'Erro');
  return r.json();
}

export default function SiteSettingsPage() {
  const [form, setForm] = useState<Settings>({ site_title: '', logo_url: '', logo_svg: '' });
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch('/settings')
      .then(s => setForm({
        site_title: s.site_title || '',
        logo_url:   s.logo_url   || '',
        logo_svg:   s.logo_svg   || '',
      }))
      .catch(() => Swal.fire('Erro', 'Não foi possível carregar as configurações.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      Swal.fire('Salvo!', 'Configurações atualizadas com sucesso.', 'success');
    } catch (err: any) {
      Swal.fire('Erro', err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const r = await fetch(`${API}/upload/logo`, {
        method: 'POST',
        credentials: 'include',
        body: data,
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Erro no upload');
      const { url } = await r.json();
      setForm(f => ({ ...f, logo_url: url, logo_svg: '' }));
    } catch (err: any) {
      Swal.fire('Erro', err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function clearLogo() {
    setForm(f => ({ ...f, logo_url: '', logo_svg: '' }));
  }

  if (loading) return <Layout><div className="page-loading">Carregando…</div></Layout>;

  const hasLogo = form.logo_url || form.logo_svg;

  return (
    <Layout>
      <div className="page-header">
        <h1>Configurações do Agente</h1>
        <p className="page-subtitle">Logo e título exibidos no front-end do agente</p>
      </div>

      <div className="form-card" style={{ maxWidth: 680 }}>
        {/* Título */}
        <div className="form-group">
          <label className="form-label">Título do Site</label>
          <input
            className="form-input"
            type="text"
            value={form.site_title}
            onChange={e => setForm(f => ({ ...f, site_title: e.target.value }))}
            placeholder="Ex.: JORNADA AKASHA"
          />
          <small className="form-hint">Exibido ao lado da logo no topo do agente.</small>
        </div>

        {/* Logo */}
        <div className="form-group">
          <label className="form-label">Logo</label>

          {/* Preview */}
          {hasLogo && (
            <div className="logo-preview-wrap">
              {form.logo_url
                ? <img src={form.logo_url} alt="logo" className="logo-preview-img" />
                : <div className="logo-preview-svg" dangerouslySetInnerHTML={{ __html: form.logo_svg }} />
              }
            </div>
          )}

          {/* Upload */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Enviando…' : '📤 Upload de imagem'}
            </button>
            {hasLogo && (
              <button className="btn-danger-outline" type="button" onClick={clearLogo}>
                🗑 Remover logo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </div>

          {/* SVG manual */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>
              Ou cole código SVG diretamente:
            </label>
            <textarea
              className="form-input form-textarea"
              rows={6}
              value={form.logo_svg}
              onChange={e => setForm(f => ({ ...f, logo_svg: e.target.value, logo_url: '' }))}
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>'
            />
            <small className="form-hint">
              Se preencher o SVG, a imagem enviada será ignorada. Deixe em branco para usar o logo padrão.
            </small>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
