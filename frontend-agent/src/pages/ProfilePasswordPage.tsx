// src/pages/ProfilePasswordPage.tsx
import { useState } from 'react';
import { changePwd } from '../api/auth';
import { swal } from '../utils/swal';

export default function ProfilePasswordPage() {
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
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Alterar Senha</h1>
      </div>

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
            <span>Senha atual <span className="profile-req">*</span></span>
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
            <span>Nova senha <span className="profile-req">*</span></span>
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
  );
}
