// src/components/InternalSidebar.tsx
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface Props {
  onToggle: () => void;
}

export default function InternalSidebar({ onToggle }: Props) {
  const { setCid } = useApp();
  return (
    <aside className="sidebar" id="sidebar">
      <header className="side-header">
        <div className="side-header-left">
          <strong style={{ display: 'block', margin: '12px 0px 8px 80px', fontSize: 20 }}>Menu</strong>
        </div>
        <div className="side-header-actions">
          <button id="sidebarToggle" className="sidebar-toggle" onClick={onToggle} title="Abrir/fechar menu">☰</button>
        </div>
      </header>

      <nav className="internal-nav">
        <NavLink to="/" className="internal-nav-item" end onClick={() => setCid(null)}>
          <span className="internal-nav-icon">💬</span>
          <span className="internal-nav-label">Voltar para as conexões</span>
        </NavLink>

        <div className="internal-nav-divider" />

        <NavLink to="/profile/password" className="internal-nav-item">
          <span className="internal-nav-icon">🔑</span>
          <span className="internal-nav-label">Alterar Senha</span>
        </NavLink>

        <NavLink to="/children" className="internal-nav-item">
          <span className="internal-nav-icon">👥</span>
          <span className="internal-nav-label">Cadastro de Filhos</span>
        </NavLink>

        <NavLink to="/store" className="internal-nav-item">
          <span className="internal-nav-icon">📦</span>
          <span className="internal-nav-label">Ativar Módulos</span>
        </NavLink>

        <NavLink to="/history" className="internal-nav-item">
          <span className="internal-nav-icon">📋</span>
          <span className="internal-nav-label">Histórico de ações</span>
        </NavLink>

        <NavLink to="/profile" className="internal-nav-item" end>
          <span className="internal-nav-icon">👤</span>
          <span className="internal-nav-label">Perfil e Configurações</span>
        </NavLink>
      </nav>

      <footer className="side-footer">
        <label className="api-url" style={{ fontSize: 11, textAlign: 'center' }}>2026© Todos os direitos reservados</label>
      </footer>
    </aside>
  );
}
