import { ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/auth';

interface Props {
  title: string;
  children: ReactNode;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('As senhas não coincidem.'); return; }
    if (next.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3>Alterar senha</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <p style={{ marginBottom: 16 }}>Senha alterada com sucesso.</p>
              <button className="btn btn-primary" onClick={onClose}>Fechar</button>
            </div>
          ) : (
            <form className="admin-form" onSubmit={handleSubmit}>
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Senha atual</label>
                <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>Nova senha</label>
                <input type="password" value={next} onChange={e => setNext(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Confirmar nova senha</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando…' : 'Alterar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ title, children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [dropOpen, setDropOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    setDropOpen(false);
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`admin-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

      <div className="admin-content">
        <header className="admin-topbar">
          <h1 className="page-title">{title}</h1>

          <div className="topbar-user" ref={dropRef}>
            <button
              className="user-initials-btn"
              onClick={() => setDropOpen(d => !d)}
              title={user?.name ?? ''}
            >
              {getInitials(user?.name)}
            </button>
            {dropOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-name">{user?.name}</div>
                <button onClick={() => { setDropOpen(false); setShowChangePwd(true); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Alterar senha
                </button>
                <button onClick={handleLogout}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>

      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </div>
  );
}
