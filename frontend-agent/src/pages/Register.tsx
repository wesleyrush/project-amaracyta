import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { getSettings, type SiteSettings } from '../api/settings';
import AkashaLogo from '../components/AkashaLogo';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

export default function Register() {
  const [fullName,      setFullName]      = useState('');
  const [iniciaticName, setIniciaticName] = useState('');
  const [birth,         setBirth]         = useState('');
  const [birthTime,     setBirthTime]     = useState('');
  const [birthCountry,  setBirthCountry]  = useState('');
  const [birthState,    setBirthState]    = useState('');
  const [birthCity,     setBirthCity]     = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPwd]           = useState('');
  const [err,           setErr]           = useState('');
  const [loading,       setLoading]       = useState(false);
  const [settings,      setSettings]      = useState<SiteSettings>({});

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const isBrazil = birthCountry.trim().toLowerCase() === 'brasil';

  function handleCountryChange(v: string) {
    setBirthCountry(v);
    setBirthState('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.register({
        email,
        password,
        full_name:      fullName.trim(),
        initiatic_name: iniciaticName.trim() || null,
        birth_date:     birth         || null,
        birth_time:     birthTime     || null,
        birth_country:  birthCountry.trim() || null,
        birth_state:    birthState.trim()   || null,
        birth_city:     birthCity.trim()    || null,
      });
      await api.login(email, password);
      location.href = '/';
    } catch (ex: any) {
      setErr(ex?.message || 'Falha no cadastro');
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

      <div className="auth-box auth-box--wide">
      <div className="auth-split-logo">{logoEl}<br/><h1 className="auth-split-textlogo">Mahamatrix</h1></div>

        <h1 className="auth-split-title">
          Criar conta
        </h1>

        <form onSubmit={onSubmit} className="auth-split-fields">

          {/* ── Identificação ── */}
          <p className="auth-section-label auth-col-span">Identificação</p>

          <div className="auth-split-field">
            <label className="auth-split-label">Nome Completo <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="text" placeholder="Seu nome completo"
                   minLength={3} required value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Nome Iniciático <span className="auth-opt">(opcional)</span></label>
            <input className="auth-split-input" type="text" placeholder="Ex.: Zephyrion Arcturiano"
                   value={iniciaticName} onChange={e => setIniciaticName(e.target.value)} />
          </div>

          {/* ── Nascimento ── */}
          <p className="auth-section-label auth-col-span">Dados de Nascimento</p>

          <div className="auth-split-field">
            <label className="auth-split-label">Data <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="date" required value={birth} onChange={e => setBirth(e.target.value)} />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Hora <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="time" required value={birthTime} onChange={e => setBirthTime(e.target.value)} />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">País <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="text" placeholder="Ex.: Brasil, Portugal…" required
                   value={birthCountry} onChange={e => handleCountryChange(e.target.value)} />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Estado <span className="auth-req">*</span></label>
            {isBrazil ? (
              <select className="auth-split-input" required value={birthState} onChange={e => setBirthState(e.target.value)}>
                <option value="">Selecione…</option>
                {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className="auth-split-input" type="text" placeholder="Estado / Província" required
                     value={birthState} onChange={e => setBirthState(e.target.value)} />
            )}
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Cidade <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="text" placeholder="Cidade" required
                   value={birthCity} onChange={e => setBirthCity(e.target.value)} />
          </div>

          {/* ── Acesso ── */}
          <p className="auth-section-label auth-col-span">Dados de Acesso</p>

          <div className="auth-split-field">
            <label className="auth-split-label">E-mail <span className="auth-req">*</span></label>
            <input className="auth-split-input" type="email" placeholder="seu@email.com" required
                   value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="auth-split-field">
            <label className="auth-split-label">Senha <span className="auth-req">*</span> <span className="auth-hint">mín. 8 caracteres</span></label>
            <input className="auth-split-input" type="password" placeholder="••••••••" minLength={8} required
                   value={password} onChange={e => setPwd(e.target.value)} />
          </div>

          {err && <p className="auth-split-err auth-col-span" role="alert">{err}</p>}

          <button className="auth-split-btn auth-col-span" type="submit" disabled={loading}>
            {loading ? 'Cadastrando…' : 'Cadastrar'}
          </button>
        </form>

        <a href="/login" className="auth-split-link">Já tenho uma conta</a>
      </div>
    </div>
  );
}
