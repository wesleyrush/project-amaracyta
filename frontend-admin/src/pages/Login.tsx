import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-lock-icon">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="28" width="40" height="28" rx="4" stroke="white" strokeWidth="3" fill="none"/>
            <path d="M20 28V22a12 12 0 0 1 24 0v6" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <circle cx="32" cy="42" r="4" fill="white"/>
            <line x1="32" y1="46" x2="32" y2="52" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-brand">
            <div className="login-brand-icon">✦</div>
            <span>Amaracyta Admin</span>
          </div>

          <h2 className="login-title">Login</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Endereço de email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
