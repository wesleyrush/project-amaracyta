import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { getSettings, type SiteSettings } from '../api/settings';
import AkashaLogo from '../components/AkashaLogo';

export default function Login() {
  const [email,    setEmail]   = useState('');
  const [password, setPwd]     = useState('');
  const [err,      setErr]     = useState('');
  const [loading,  setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({});

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.login(email, password);
      await api.me();
      location.href = '/';
    } catch (ex: any) {
      setErr(ex?.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  const logoEl = settings.logo_svg
    ? <span className="auth-logo-svg" dangerouslySetInnerHTML={{ __html: settings.logo_svg }} />
    : settings.logo_url
      ? <img src={settings.logo_url} alt="logo" className="auth-logo-img" />
      : <AkashaLogo size={160} />;

  return (
    <div
      className="auth-page"
      style={settings.login_bg_url ? { backgroundImage: `url(${settings.login_bg_url})` } : undefined}
    >
      <div className="auth-overlay" />

      <div className="auth-box">
        <div className="auth-split-logo">{logoEl}<br/><h1 className="auth-split-textlogo">Mahamatrix</h1></div>

        <h2 className="auth-split-title">
          Faça seu Login
        </h2>

        <form onSubmit={onSubmit} className="auth-split-fields">
          <div className="auth-split-field">
            <label className="auth-split-label">Email</label>
            <input
              className="auth-split-input"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Senha</label>
            <input
              className="auth-split-input"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              value={password}
              onChange={e => setPwd(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {err && <p className="auth-split-err" role="alert">{err}</p>}

          <button className="auth-split-btn" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <a href="/register" className="auth-split-link">Ainda não tenho uma conta</a>
      </div>
    </div>
  );
}
