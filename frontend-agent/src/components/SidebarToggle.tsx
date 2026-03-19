type Props = {
  onToggle: () => void;   // vindo do ChatPage
};

export function SidebarToggle({ onToggle }: Props) {
  return (
    <button
      type="button"
      className="sidebar-toggle-fab"
      aria-label="Abrir/fechar menu lateral"
      title="Menu"
      onClick={onToggle}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6"  x2="21" y2="6"  />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}