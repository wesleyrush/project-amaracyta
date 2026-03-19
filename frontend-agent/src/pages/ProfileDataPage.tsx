// src/pages/ProfileDataPage.tsx
import { useEffect, useState } from 'react';
import { getProfile, putProfile } from '../api/auth';
import { swal } from '../utils/swal';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';

const THEME_LABELS: Record<Theme, string> = { system: 'Padrão do sistema', dark: 'Escuro', light: 'Claro' };
const THEME_ICONS:  Record<Theme, string> = { system: '🖥', dark: '🌙', light: '☀️' };

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

export default function ProfileDataPage() {
  const { theme, setTheme } = useTheme();
  const [fullName,      setFullName]      = useState('');
  const [iniciaticName, setIniciaticName] = useState('');
  const [birth,         setBirth]         = useState('');
  const [birthTime,     setBirthTime]     = useState('');
  const [birthCountry,  setBirthCountry]  = useState('');
  const [birthState,    setBirthState]    = useState('');
  const [birthCity,     setBirthCity]     = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const isBrazil = birthCountry.trim().toLowerCase() === 'brasil';

  function handleCountryChange(v: string) {
    setBirthCountry(v);
    setBirthState('');
  }

  useEffect(() => {
    getProfile()
      .then(p => {
        setFullName(p.full_name      || '');
        setIniciaticName(p.initiatic_name || '');
        setBirth(p.birth_date        || '');
        setBirthTime(p.birth_time    || '');
        setBirthCountry(p.birth_country || '');
        setBirthState(p.birth_state  || '');
        setBirthCity(p.birth_city    || '');
      })
      .catch(() => swal.error('Erro', 'Não foi possível carregar o perfil.'));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim())        { swal.error('Campo obrigatório', 'O nome completo não pode ficar em branco.'); return; }
    if (!birth)                  { swal.error('Campo obrigatório', 'Informe a data de nascimento.'); return; }
    if (!birthTime)              { swal.error('Campo obrigatório', 'Informe a hora de nascimento.'); return; }
    if (!birthCountry.trim())    { swal.error('Campo obrigatório', 'Informe o país de nascimento.'); return; }
    if (!birthState.trim())      { swal.error('Campo obrigatório', 'Informe o estado de nascimento.'); return; }
    if (!birthCity.trim())       { swal.error('Campo obrigatório', 'Informe a cidade de nascimento.'); return; }
    setSavingProfile(true);
    try {
      await putProfile({
        full_name:      fullName.trim(),
        initiatic_name: iniciaticName.trim() || null,
        birth_date:     birth         || null,
        birth_time:     birthTime     || null,
        birth_country:  birthCountry.trim() || null,
        birth_state:    birthState.trim()   || null,
        birth_city:     birthCity.trim()    || null,
      });
      swal.success('Dados salvos!');
    } catch {
      swal.error('Erro ao salvar', 'Não foi possível salvar os dados. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Perfil e Configurações</h1>
      </div>

      <section className="profile-card">
        <div className="profile-card-head">
          <span className="profile-card-icon">👤</span>
          <div>
            <h2 className="profile-card-title">Alterar dados</h2>
            <p className="profile-card-sub">Atualize suas informações pessoais</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSaveProfile}>

          <label className="profile-label">
            <span>Nome Completo <span className="profile-req">*</span></span>
            <input
              type="text"
              className="profile-input"
              minLength={3}
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="profile-label">
            <span>Nome Iniciático <span className="profile-opt">(opcional)</span></span>
            <input
              type="text"
              className="profile-input"
              placeholder="Ex.: Zephyrion Arcturiano"
              value={iniciaticName}
              onChange={e => setIniciaticName(e.target.value)}
            />
          </label>

          <div className="profile-field-row">
            <label className="profile-label">
              <span>Data de Nascimento <span className="profile-req">*</span> <span className="profile-hint">(dd/mm/aaaa)</span></span>
              <input
                type="date"
                className="profile-input"
                required
                value={birth}
                onChange={e => setBirth(e.target.value)}
              />
            </label>
            <label className="profile-label">
              <span>Hora de Nascimento <span className="profile-req">*</span> <span className="profile-hint">(hh:mm)</span></span>
              <input
                type="time"
                className="profile-input"
                required
                value={birthTime}
                onChange={e => setBirthTime(e.target.value)}
              />
            </label>
          </div>

          <label className="profile-label">
            <span>País de Nascimento <span className="profile-req">*</span></span>
            <input
              type="text"
              className="profile-input"
              placeholder="Ex.: Brasil, Portugal, Argentina…"
              required
              value={birthCountry}
              onChange={e => handleCountryChange(e.target.value)}
            />
          </label>

          <div className="profile-field-row">
            <label className="profile-label">
              <span>Estado <span className="profile-req">*</span></span>
              {isBrazil ? (
                <select
                  className="profile-input"
                  required
                  value={birthState}
                  onChange={e => setBirthState(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  className="profile-input"
                  required
                  placeholder="Estado / Província"
                  value={birthState}
                  onChange={e => setBirthState(e.target.value)}
                />
              )}
            </label>
            <label className="profile-label">
              <span>Cidade <span className="profile-req">*</span></span>
              <input
                type="text"
                className="profile-input"
                required
                placeholder="Cidade"
                value={birthCity}
                onChange={e => setBirthCity(e.target.value)}
              />
            </label>
          </div>

          <div className="profile-form-actions">
            <button type="submit" className="profile-btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Salvando…' : 'Salvar dados'}
            </button>
          </div>
        </form>
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <span className="profile-card-icon">🎨</span>
          <div>
            <h2 className="profile-card-title">Aparência</h2>
            <p className="profile-card-sub">Escolha o tema da interface</p>
          </div>
        </div>
        <div className="theme-selector-row">
          {(['light', 'dark', 'system'] as Theme[]).map(t => (
            <button
              key={t}
              className={`theme-option-btn${theme === t ? ' active' : ''}`}
              onClick={() => setTheme(t)}
            >
              <span className="theme-option-icon">{THEME_ICONS[t]}</span>
              <span className="theme-option-label">{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
