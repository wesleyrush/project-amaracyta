import { FormEvent, useState } from 'react';
import { api } from '../api/client';
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

  const isBrazil = birthCountry.trim().toLowerCase() === 'brasil';

  function handleCountryChange(v: string) {
    setBirthCountry(v);
    setBirthState(''); // reset state when country changes
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

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <AkashaLogo size={96} />
        <h1 className="auth-brand-name">Mahamatrix</h1>
      </div>

      <div className="auth-card auth-card--wide">
        <h2 className="auth-card-title">Criar conta</h2>

        <form onSubmit={onSubmit}>

          {/* ── Identificação ── */}
          <p className="auth-section-label">Identificação</p>

          <div className="auth-field">
            <label className="auth-label">
              Nome Completo <span className="auth-req">*</span>
            </label>
            <input type="text" placeholder="Seu nome completo" minLength={3} required
                   value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div className="auth-field">
            <label className="auth-label">
              Nome Iniciático <span className="auth-opt">(opcional)</span>
            </label>
            <input type="text" placeholder="Ex.: Zephyrion Arcturiano"
                   value={iniciaticName} onChange={e => setIniciaticName(e.target.value)} />
          </div>

          {/* ── Nascimento ── */}
          <p className="auth-section-label">Dados de Nascimento</p>

          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-label">
                Data <span className="auth-req">*</span>
                <span className="auth-hint"> dd/mm/aaaa</span>
              </label>
              <input type="date" required value={birth} onChange={e => setBirth(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">
                Hora <span className="auth-req">*</span>
                <span className="auth-hint"> hh:mm</span>
              </label>
              <input type="time" required value={birthTime} onChange={e => setBirthTime(e.target.value)} />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">País <span className="auth-req">*</span></label>
            <input type="text" placeholder="Ex.: Brasil, Portugal, Argentina…" required
                   value={birthCountry} onChange={e => handleCountryChange(e.target.value)} />
          </div>

          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-label">Estado <span className="auth-req">*</span></label>
              {isBrazil ? (
                <select required value={birthState} onChange={e => setBirthState(e.target.value)}>
                  <option value="">Selecione…</option>
                  {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Estado / Província" required
                       value={birthState} onChange={e => setBirthState(e.target.value)} />
              )}
            </div>
            <div className="auth-field">
              <label className="auth-label">Cidade <span className="auth-req">*</span></label>
              <input type="text" placeholder="Cidade" required
                     value={birthCity} onChange={e => setBirthCity(e.target.value)} />
            </div>
          </div>

          {/* ── Acesso ── */}
          <p className="auth-section-label">Dados de Acesso</p>

          <div className="auth-field">
            <label className="auth-label">E-mail <span className="auth-req">*</span></label>
            <input type="email" placeholder="seu@email.com" required
                   value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="auth-field">
            <label className="auth-label">
              Senha <span className="auth-req">*</span>
              <span className="auth-hint"> mínimo 8 caracteres</span>
            </label>
            <input type="password" placeholder="••••••••" minLength={8} required
                   value={password} onChange={e => setPwd(e.target.value)} />
          </div>

          {err && <p className="auth-err" role="alert">{err}</p>}

          <button className="btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Cadastrando…' : 'Cadastrar'}
          </button>
        </form>

        <p className="auth-footer-link">Já tem conta? <a href="/login">Entrar</a></p>
      </div>
    </div>
  );
}
