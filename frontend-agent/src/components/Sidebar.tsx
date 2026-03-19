// src/components/Sidebar.tsx
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { listSessions, patchTitle, deleteSession } from '../api/sessions';
import { swal } from '../utils/swal';
import type { SessionListItem } from '../types';

const SIDEBAR_LIMIT = 6;

function normalizeTitles(items: SessionListItem[]) {
  return items.map(it => {
    const force = localStorage.getItem(`FORCE_NOVA_CONVERSA__${it.id}`) === '1';
    return force ? { ...it, title: 'Nova conversa' } : it;
  });
}

function fmtShort(dt: string | null | undefined): string {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function fmtFull(dt: string | null | undefined): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR');
}

function CoinsConsumed({ coins }: { coins?: SessionListItem['coins_consumed'] }) {
  if (!coins) return <span className="asd-coins-empty">—</span>;
  const parts: string[] = [];
  if (coins.gold   > 0) parts.push(`🟡 ${coins.gold.toFixed(3)}`);
  if (coins.silver > 0) parts.push(`⚪ ${coins.silver.toFixed(3)}`);
  if (coins.bronze > 0) parts.push(`🟤 ${coins.bronze.toFixed(3)}`);
  if (!parts.length) return <span className="asd-coins-empty">—</span>;
  return <span>{parts.join(' · ')}</span>;
}

export default function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { cid, setCid, sessions, setSessions, setShowModulePicker } = useApp();

  const [openMenu, setOpenMenu]     = useState<string | null>(null);
  const [menuPos,  setMenuPos]      = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [draftTitle,  setDraftTitle]  = useState<string>('');
  const [showAll,     setShowAll]     = useState(false);

  const editRef   = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Recarrega sessões quando cid muda
  useEffect(() => {
    (async () => {
      const list = await listSessions();
      setSessions(normalizeTitles(list.items));
    })();
  }, [cid, setSessions]);

  // Foca input de edição inline
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  // Fecha dropdown fixo ao clicar fora ou rolar
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [openMenu]);

  // Abre / fecha dialog "Ver todas"
  useEffect(() => {
    if (showAll) dialogRef.current?.showModal();
    else         dialogRef.current?.close();
  }, [showAll]);

  function newConversation() { setShowModulePicker(true); }

  function handleMenuToggle(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    if (openMenu === id) { setOpenMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenu(id);
  }

  function startInlineEdit(id: string, currentTitle: string) {
    setOpenMenu(null);
    setEditingId(id);
    setDraftTitle((currentTitle || '').trim());
  }

  function cancelInlineEdit() {
    setEditingId(null);
    setDraftTitle('');
  }

  async function commitInlineEdit() {
    if (!editingId) return;
    const newTitle = (draftTitle || '').trim();
    if (!newTitle) { cancelInlineEdit(); return; }
    try {
      await patchTitle(editingId, newTitle);
      localStorage.removeItem(`FORCE_NOVA_CONVERSA__${editingId}`);
      const list = await listSessions();
      setSessions(normalizeTitles(list.items));
      if (editingId === cid) {
        const el = document.getElementById('convTitle');
        if (el) el.textContent = newTitle;
      }
    } finally {
      cancelInlineEdit();
    }
  }

  function onEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  { e.preventDefault(); commitInlineEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelInlineEdit(); }
  }

  async function onDelete(id: string) {
    setOpenMenu(null);
    const ok = await swal.confirm('Excluir conversa?', 'Esta ação não pode ser desfeita.');
    if (!ok) return;
    await deleteSession(id);
    const list = await listSessions();
    setSessions(list.items || []);
    if (!list.items?.length) {
      setCid('');
      setShowModulePicker(true);
    } else {
      setCid(list.items[0].id);
    }
  }

  // Sessões já chegam ordenadas por updated_at desc do backend
  const visible = sessions.slice(0, SIDEBAR_LIMIT);
  const hasMore = sessions.length > SIDEBAR_LIMIT;

  return (
    <>
      <aside className="sidebar" id="sidebar">
        <header className="side-header">
          <div className="side-header-left">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ display: 'block', margin: '12px 0px 8px 80px', fontSize: 20 }}>Suas conexões</strong>
            </div>
          </div>
          <div className="side-header-actions">
            <button id="sidebarToggle" className="sidebar-toggle" onClick={onToggle} title="Abrir/fechar menu">☰</button>
          </div>
        </header>

        <div className="side-actions">
          <button id="newConvBtn" className="btn new-conv" style={{ fontSize: 14, width: '100%' }} onClick={newConversation}>
            + Nova conexão
          </button>
        </div>

        <div className="conv-section">
          <nav className="conv-list">
            <ul id="conversations">
              {visible.map(it => {
                const isActive  = it.id === cid;
                const isEditing = editingId === it.id;
                return (
                  <li
                    key={it.id}
                    className={`conv-item ${isActive ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                  >
                    <a
                      href={`?cid=${encodeURIComponent(it.id)}`}
                      className="conv-link"
                      data-cid={it.id}
                      onClick={e => {
                        if (isEditing) { e.preventDefault(); return; }
                        e.preventDefault();
                        setCid(it.id);
                        setOpenMenu(null);
                      }}
                      onDoubleClick={e => {
                        e.preventDefault();
                        startInlineEdit(it.id, it.title || it.id);
                      }}
                      title={it.title || it.id}
                    >
                      {isEditing ? (
                        <input
                          ref={editRef}
                          type="text"
                          className="conv-title-edit"
                          value={draftTitle}
                          onChange={e => setDraftTitle(e.target.value)}
                          onKeyDown={onEditKeyDown}
                          onBlur={commitInlineEdit}
                          placeholder="Novo título da conversa"
                          aria-label="Editar título da conversa"
                        />
                      ) : (
                        <div className="conv-title">
                          <div className="conv-title-top">
                            {it.module_name && (
                              <span className="conv-module-badge">{it.module_name}</span>
                            )}
                            {it.updated_at && (
                              <span className="conv-date">{fmtShort(it.updated_at)}</span>
                            )}
                          </div>
                          <span className="conv-person-badge">
                            {it.child_id ? `👶 ${it.child_name}` : '👤 Eu'}
                          </span>
                          <span className="conv-title-text">{it.title || it.id}</span>
                        </div>
                      )}
                    </a>

                    <div className="conv-actions">
                      <button
                        className="conv-more"
                        type="button"
                        title="Ações"
                        onClick={e => handleMenuToggle(e, it.id)}
                      >⋯</button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {sessions.length > 0 && (
              <button
                className="conv-see-all-btn"
                onClick={() => setShowAll(true)}
              >
                {hasMore
                  ? `Ver todas (${sessions.length}) →`
                  : 'Ver detalhes das conexões →'}
              </button>
            )}
          </nav>
        </div>

        <footer className="side-footer">
          <label className="api-url" style={{ fontSize: 11, textAlign: 'center' }}>2026© Todos os direitos reservados</label>
        </footer>
      </aside>

      {/* Dropdown fixo — renderizado fora do sidebar para não ser cortado pelo overflow */}
      {openMenu && (() => {
        const it = sessions.find(s => s.id === openMenu);
        if (!it) return null;
        return (
          <div
            className="conv-menu"
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 2000, display: 'grid' }}
            onClick={e => e.stopPropagation()}
          >
            <button className="menu-item rename" type="button" onClick={() => startInlineEdit(it.id, it.title || it.id)}>
              <span>✎</span> <span>Renomear</span>
            </button>
            <button className="menu-item delete" type="button" onClick={() => onDelete(it.id)}>
              <span>🗑</span> <span>Excluir</span>
            </button>
          </div>
        );
      })()}

      {/* Dialog "Ver todas as conexões" */}
      <dialog ref={dialogRef} className="all-sessions-dialog" onClose={() => setShowAll(false)}>
        <div className="asd-inner">
          <div className="asd-head">
            <h3>Todas as conexões</h3>
            <button className="asd-close" onClick={() => setShowAll(false)}>✕</button>
          </div>
          <div className="asd-table-wrap">
            <table className="asd-table">
              <thead>
                <tr>
                  <th>Última interação</th>
                  <th>Módulo</th>
                  <th>Pessoa</th>
                  <th>Conversa</th>
                  <th>Saldo consumido</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(it => (
                  <tr key={it.id} className={it.id === cid ? 'asd-row-active' : ''}>
                    <td className="asd-date">{fmtFull(it.updated_at)}</td>
                    <td>
                      {it.module_name
                        ? <span className="conv-module-badge">{it.module_name}</span>
                        : <span className="asd-coins-empty">—</span>}
                    </td>
                    <td className="asd-person">
                      {it.child_id
                        ? <span className="conv-person-badge child">👶 {it.child_name}</span>
                        : <span className="conv-person-badge self">👤 Eu</span>}
                    </td>
                    <td className="asd-title">{it.title || it.id}</td>
                    <td className="asd-coins"><CoinsConsumed coins={it.coins_consumed} /></td>
                    <td>
                      <button
                        className={`asd-open-btn ${it.id === cid ? 'asd-open-btn-active' : ''}`}
                        onClick={() => { setCid(it.id); setShowAll(false); }}
                      >
                        {it.id === cid ? '✓ Ativa' : 'Abrir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </dialog>
    </>
  );
}
