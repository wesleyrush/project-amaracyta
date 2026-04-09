import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

interface Settings {
  site_title: string;
  logo_url: string;
  logo_svg: string;
  login_bg_url: string;
}

const API = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  if (!r.ok) throw new Error((await r.json()).error || 'Erro');
  return r.json();
}

export default function SiteSettingsPage() {
  const { hasResource } = useAuth();
  const [form, setForm] = useState<Settings>({ site_title: '', logo_url: '', logo_svg: '', login_bg_url: '' });
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasResource('configuracoes')) return;
    apiFetch('/settings')
      .then(s => setForm({
        site_title:   s.site_title   || '',
        logo_url:     s.logo_url     || '',
        logo_svg:     s.logo_svg     || '',
        login_bg_url: s.login_bg_url || '',
      }))
      .catch(() => Swal.fire('Erro', 'Não foi possível carregar as configurações.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (!hasResource('configuracoes')) return <Navigate to="/" replace />;

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

  async function handleUploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const r = await fetch(`${API}/upload/login-bg`, {
        method: 'POST',
        credentials: 'include',
        body: data,
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Erro no upload');
      const { url } = await r.json();
      setForm(f => ({ ...f, login_bg_url: url }));
    } catch (err: any) {
      Swal.fire('Erro', err.message, 'error');
    } finally {
      setUploadingBg(false);
      if (bgFileRef.current) bgFileRef.current.value = '';
    }
  }

  if (loading) return <Layout title="Configurações do Agente"><div className="page-loading">Carregando…</div></Layout>;

  const hasLogo = form.logo_url || form.logo_svg;

  return (
    <Layout title="Configurações do Agente">
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

        {/* Imagem de fundo do Login */}
        <div className="form-group">
          <label className="form-label">Imagem de Fundo do Login</label>

          {form.login_bg_url && (
            <div className="logo-preview-wrap" style={{ maxHeight: 160, overflow: 'hidden', borderRadius: 8, marginBottom: 12 }}>
              <img src={form.login_bg_url} alt="login bg" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => bgFileRef.current?.click()}
              disabled={uploadingBg}
            >
              {uploadingBg ? 'Enviando…' : '📤 Upload de imagem'}
            </button>
            {form.login_bg_url && (
              <button className="btn-danger-outline" type="button" onClick={() => setForm(f => ({ ...f, login_bg_url: '' }))}>
                🗑 Remover imagem
              </button>
            )}
            <input
              ref={bgFileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              style={{ display: 'none' }}
              onChange={handleUploadBg}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Ou cole uma URL diretamente:</label>
            <input
              className="form-input"
              type="url"
              value={form.login_bg_url}
              onChange={e => setForm(f => ({ ...f, login_bg_url: e.target.value }))}
              placeholder="https://..."
            />
            <small className="form-hint">Exibida no painel direito da tela de login e cadastro.</small>
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
