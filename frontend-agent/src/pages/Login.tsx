import { FormEvent, useState } from 'react';
import { api } from '../api/client';
import AkashaLogo from '../components/AkashaLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPwd] = useState('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.login(email, password);   // usa apiWrite -> garante CSRF + cookies
      await api.me();                     // sanity check; opcional
      location.href = '/';
    } catch (ex: any) {
      setErr(ex?.message || 'Falha no login');
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

      <div className="auth-card">
        <h2 className="auth-card-title">Acessar</h2>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            required
            minLength={8}
            value={password}
            onChange={e => setPwd(e.target.value)}
            autoComplete="current-password"
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="muted">Não tem conta? <a href="/register">Criar conta</a></p>
        {err && <p className="muted" role="alert">{err}</p>}
      </div>
    </div>
  );
}