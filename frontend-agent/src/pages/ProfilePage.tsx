// src/pages/ProfilePage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, putProfile, changePwd } from '../api/auth';
import { swal } from '../utils/swal';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

export default function ProfilePage() {
  const navigate = useNavigate();

  // --- Alterar dados ---
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

  // --- Alterar senha ---
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [savingPw, setSavingPw]   = useState(false);

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw) { swal.error('Campos obrigatórios', 'Preencha a senha atual e a nova senha.'); return; }
    if (newPw.length < 8) { swal.error('Senha inválida', 'A nova senha deve ter pelo menos 8 caracteres.'); return; }
    setSavingPw(true);
    try {
      await changePwd({ current_password: currentPw, new_password: newPw });
      swal.success('Senha alterada!', 'Sua senha foi atualizada com sucesso.');
      setCurrentPw('');
      setNewPw('');
    } catch {
      swal.error('Falha ao alterar senha', 'Verifique se a senha atual está correta.');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <button className="profile-back-btn" onClick={() => navigate(-1)} title="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </button>
          <h1 className="profile-title">Perfil e Configurações</h1>
        </div>

        {/* ---- Seção: Alterar dados ---- */}
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

        {/* ---- Seção: Alterar senha ---- */}
        <section className="profile-card">
          <div className="profile-card-head">
            <span className="profile-card-icon">🔑</span>
            <div>
              <h2 className="profile-card-title">Alterar senha</h2>
              <p className="profile-card-sub">Defina uma nova senha para sua conta</p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSavePassword}>
            <label className="profile-label">
              Senha atual
              <input
                type="password"
                className="profile-input"
                minLength={8}
                required
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="profile-label">
              Nova senha
              <input
                type="password"
                className="profile-input"
                minLength={8}
                required
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            <div className="profile-form-actions">
              <button type="submit" className="profile-btn-primary" disabled={savingPw}>
                {savingPw ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
