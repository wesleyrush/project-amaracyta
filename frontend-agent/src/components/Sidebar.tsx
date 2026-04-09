// src/components/Sidebar.tsx
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { listSessions, deleteSession } from '../api/sessions';
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
  const { cid, setCid, sessions, setSessions, setShowModulePicker, user } = useApp();

  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Recarrega sessões quando cid muda
  useEffect(() => {
    (async () => {
      const list = await listSessions();
      setSessions(normalizeTitles(list.items));
    })();
  }, [cid, setSessions]);

  // Abre / fecha dialog "Ver todas"
  useEffect(() => {
    if (showAll) dialogRef.current?.showModal();
    else         dialogRef.current?.close();
  }, [showAll]);

  function newConversation() { setShowModulePicker(true); }

  async function handleDelete(id: string) {
    const confirmed = await swal.confirm(
      'Excluir conexão',
      'Esta conexão será excluída permanentemente. Deseja continuar?',
      'Sim, excluir'
    );
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      if (id === cid) {
        if (updated.length > 0) {
          setCid(updated[0].id);
        } else {
          setShowModulePicker(true);
        }
      }
    } catch {
      // swal.ask usado apenas para confirmação; erros exibidos via alert simples
      alert('Não foi possível excluir a conexão.');
    } finally {
      setDeletingId(null);
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
              <strong style={{ display: 'block', margin: '0 0 0 56px', fontSize: 16 }}>Módulos iniciados</strong>
            </div>
          </div>
          <div className="side-header-actions">
            <button id="sidebarToggle" className="sidebar-toggle" onClick={onToggle} title="Abrir/fechar menu">☰</button>
          </div>
        </header>

        <div className="side-actions">
          <button id="newConvBtn" className="btn new-conv" onClick={newConversation}>
            ✦ Clique aqui para iniciar um novo módulo
          </button>
        </div>

        <div className="conv-section">
          <nav className="conv-list">
            <ul id="conversations">
              {visible.map(it => {
                const isActive = it.id === cid;
                const personName = it.child_id
                  ? (it.child_name || 'Filho(a)')
                  : (user?.full_name || 'Eu');
                return (
                  <li key={it.id} className={`conv-item ${isActive ? 'active' : ''}`}>
                    <a
                      href={`?cid=${encodeURIComponent(it.id)}`}
                      className="conv-link"
                      data-cid={it.id}
                      onClick={e => {
                        e.preventDefault();
                        setCid(it.id);
                      }}
                      title={personName}
                    >
                      <div className="conv-title">
                        <span className="conv-person-name">
                          <span className="conv-person-icon">👤</span> {personName}
                        </span>
                        <span className="conv-module-date">
                          Módulo: {it.module_name || '—'}
                          {it.updated_at ? ` · ${fmtShort(it.updated_at)}` : ''}
                        </span>
                      </div>
                    </a>
                    {!(it.flow_step && it.flow_step > 0) && (
                      <button
                        className="conv-delete-btn"
                        title="Excluir conexão"
                        disabled={deletingId === it.id}
                        onClick={e => { e.stopPropagation(); void handleDelete(it.id); }}
                      >
                        ✕
                      </button>
                    )}
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
                        ? <span className="conv-person-badge child">👤 {it.child_name}</span>
                        : <span className="conv-person-badge self">👤 {user?.full_name || 'Eu'}</span>}
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
