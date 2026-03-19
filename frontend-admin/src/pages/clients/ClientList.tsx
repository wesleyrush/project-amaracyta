import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import {
  listClients, toggleClient, deleteClient,
  getClientSessions, getClientMessages,
  addClientBalance, getClientTransactions,
} from '../../api/clients';
import { useAuth } from '../../context/AuthContext';
import type { Client, ClientSession, ClientMessage, CoinTransaction } from '../../types';
import { swal } from '../../utils/swal';

type ModalType = 'edit' | 'sessions' | 'messages' | 'balance' | 'children' | null;

export default function ClientList() {
  const [data,    setData]    = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<ModalType>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [sessions,     setSessions]     = useState<ClientSession[]>([]);
  const [messages,     setMessages]     = useState<ClientMessage[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [clientChildren, setClientChildren] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const { hasPerm } = useAuth();

  useEffect(() => {
    if (activeDropdown === null) return;
    const close = () => setActiveDropdown(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [activeDropdown]);

  const openDropdown = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    if (activeDropdown === id) { setActiveDropdown(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setActiveDropdown(id);
  };

  const load = () => {
    setLoading(true);
    listClients().then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = async (type: ModalType, row: Client) => {
    setSelected(row);
    setModal(type);
    if (type === 'sessions') {
      setSubLoading(true);
      getClientSessions(row.id).then(setSessions).finally(() => setSubLoading(false));
    } else if (type === 'messages') {
      setSubLoading(true);
      getClientMessages(row.id).then(setMessages).finally(() => setSubLoading(false));
    } else if (type === 'balance') {
      setSubLoading(true);
      getClientTransactions(row.id).then(setTransactions).finally(() => setSubLoading(false));
    } else if (type === 'children') {
      setSubLoading(true);
      fetch(`/api/clients/${row.id}/children`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setClientChildren(d.items || []))
        .finally(() => setSubLoading(false));
    }
  };

  const handleToggle = async (row: Client) => {
    const action = row.is_active ? 'bloquear' : 'desbloquear';
    const ok = await swal.confirmToggle(`${action.charAt(0).toUpperCase() + action.slice(1)} cliente?`, `O cliente "${row.full_name}" será ${row.is_active ? 'bloqueado' : 'desbloqueado'}.`);
    if (!ok) return;
    await toggleClient(row.id);
    load();
  };

  const handleDelete = async (row: Client) => {
    const ok = await swal.confirm('Excluir cliente?', `"${row.full_name}" e todos os seus dados serão excluídos. Essa ação é irreversível.`);
    if (!ok) return;
    try {
      await deleteClient(row.id);
      swal.success('Cliente excluído com sucesso.');
      load();
    } catch (err: any) {
      swal.error('Erro ao excluir', err.response?.data?.error || 'Tente novamente.');
    }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'full_name',     label: 'Nome Completo', sortable: true },
    { key: 'email',         label: 'Email',         sortable: true },
    { key: 'birth_date',    label: 'Nascimento',    sortable: true,
      render: row => fmt(row.birth_date as string | null) },
    { key: 'created_at',    label: 'Cadastrado em', sortable: true,
      render: row => fmt(row.created_at as string) },
    { key: 'message_count', label: 'Mensagens', sortable: true },
    { key: 'is_active',     label: 'Status',        sortable: true,
      render: row => (
        <span className={`badge ${row.is_active ? 'badge-active' : 'badge-blocked'}`}>
          {row.is_active ? 'Ativo' : 'Bloqueado'}
        </span>
      ),
    },
  ];

  return (
    <Layout title="Clientes">
      <div className="card">
        <div className="card-header">
          <h2>Listar Clientes</h2>
        </div>
        <div className="card-body">
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            loading={loading}
            actions={row => {
              const client = row as unknown as Client;
              return (
                <div className="action-btns">
                  {hasPerm('clientes', 'update') && (
                    <button className="btn-icon btn-edit" title="Editar"
                      onClick={() => openModal('edit', client)}>✎</button>
                  )}
                  {hasPerm('clientes', 'update') && (
                    <button
                      className={`btn-icon ${client.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                      title={client.is_active ? 'Bloquear' : 'Desbloquear'}
                      onClick={() => handleToggle(client)}
                    >{client.is_active ? '🔒' : '🔓'}</button>
                  )}
                  {hasPerm('clientes', 'delete') && (
                    <button className="btn-icon btn-delete" title="Excluir"
                      onClick={() => handleDelete(client)}>🗑</button>
                  )}
                  <div className="dropdown">
                    <button
                      className="btn-icon btn-more"
                      title="Mais opções"
                      onClick={e => openDropdown(e, client.id)}
                    >⋮</button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Dropdown flutuante (fora da tabela para não ser cortado pelo overflow) */}
      {activeDropdown !== null && dropdownPos && (() => {
        const client = data.find(c => c.id === activeDropdown)!;
        return (
          <div
            className="dropdown-menu"
            style={{ display: 'block', position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 1000 }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setActiveDropdown(null); openModal('sessions', client); }}>📋 Listar Acessos</button>
            <button onClick={() => { setActiveDropdown(null); openModal('messages', client); }}>💬 Listar Mensagens</button>
            {hasPerm('cobranca', 'update') && (
              <button onClick={() => { setActiveDropdown(null); openModal('balance', client); }}>✦ Gerenciar Saldo</button>
            )}
            <button onClick={() => { setActiveDropdown(null); openModal('children', client); }}>👶 Filhos</button>
          </div>
        );
      })()}

      {/* Modal: Listar Acessos */}
      <Modal
        open={modal === 'sessions'}
        title={`Acessos — ${selected?.full_name}`}
        onClose={() => setModal(null)}
        wide
      >
        {subLoading ? <p>Carregando...</p> : (
          <div className="modal-table-wrap">
            <table className="modal-table">
              <thead>
                <tr>
                  <th>ID da Sessão</th>
                  <th>Usuário</th>
                  <th>Título</th>
                  <th>Módulo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} className="dt-empty">Nenhum acesso encontrado</td></tr>
                ) : sessions.map(s => (
                  <tr key={s.id}>
                    <td><code className="text-mono">{s.id.slice(0, 12)}…</code></td>
                    <td>{s.full_name}</td>
                    <td className="text-truncate" style={{ maxWidth: 200 }}>{s.title}</td>
                    <td>{s.module_name ?? '-'}</td>
                    <td>{fmt(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Modal: Listar Mensagens */}
      <Modal
        open={modal === 'messages'}
        title={`Mensagens — ${selected?.full_name}`}
        onClose={() => setModal(null)}
        wide
      >
        {subLoading ? <p>Carregando...</p> : (
          <DataTable
            columns={[
              { key: 'session_id', label: 'Sessão', sortable: false,
                render: row => <code className="text-mono">{String(row.session_id).slice(0, 10)}…</code> },
              { key: 'module_name', label: 'Módulo', sortable: true,
                render: row => String(row.module_name ?? '-') },
              { key: 'role', label: 'Papel', sortable: true,
                render: row => (
                  <span className={`badge ${row.role === 'user' ? 'badge-user' : 'badge-assistant'}`}>
                    {String(row.role)}
                  </span>
                )},
              { key: 'content', label: 'Mensagem', sortable: false,
                render: row => {
                  const c = String(row.content ?? '');
                  return <span title={c}>{c.slice(0, 80)}{c.length > 80 ? '…' : ''}</span>;
                }},
              { key: 'coin_value', label: 'Valor', sortable: true,
                render: row => row.coin_value != null
                  ? Number(row.coin_value).toLocaleString('pt-BR', { minimumFractionDigits: 7 })
                  : '-' },
              { key: 'coin_type', label: 'Moeda', sortable: true,
                render: row => {
                  const icons: Record<string, string> = { gold: '🟡 Ouro', silver: '⚪ Prata', bronze: '🟤 Cobre' };
                  return row.coin_type ? (icons[String(row.coin_type)] ?? String(row.coin_type)) : '-';
                }},
              { key: 'ts', label: 'Data', sortable: true,
                render: row => new Date(String(row.ts)).toLocaleString('pt-BR') },
            ]}
            data={messages as unknown as Record<string, unknown>[]}
            loading={false}
          />
        )}
      </Modal>

      {/* Modal: Gerenciar Saldo */}
      <Modal
        open={modal === 'balance'}
        title={`Saldo — ${selected?.full_name}`}
        onClose={() => setModal(null)}
        wide
      >
        {selected && (
          <BalancePanel
            client={selected}
            transactions={transactions}
            subLoading={subLoading}
            onAdded={() => {
              load();
              if (selected) getClientTransactions(selected.id).then(setTransactions);
            }}
          />
        )}
      </Modal>

      {/* Modal: Filhos */}
      <Modal
        open={modal === 'children'}
        title={`Filhos — ${selected?.full_name}`}
        onClose={() => setModal(null)}
        wide
      >
        {subLoading ? <p>Carregando...</p> : (
          <div className="modal-table-wrap">
            <table className="modal-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Nome Iniciático</th>
                  <th>Nascimento</th>
                  <th>Hora</th>
                  <th>País</th>
                  <th>Estado</th>
                  <th>Cidade</th>
                </tr>
              </thead>
              <tbody>
                {clientChildren.length === 0 ? (
                  <tr><td colSpan={7} className="dt-empty">Nenhum filho cadastrado</td></tr>
                ) : clientChildren.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.full_name}</td>
                    <td>{c.initiatic_name ?? '-'}</td>
                    <td>{c.birth_date ? String(c.birth_date).slice(0, 10).split('-').reverse().join('/') : '-'}</td>
                    <td>{c.birth_time ?? '-'}</td>
                    <td>{c.birth_country ?? '-'}</td>
                    <td>{c.birth_state ?? '-'}</td>
                    <td>{c.birth_city ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Modal: Editar cliente */}
      <Modal
        open={modal === 'edit'}
        title={`Editar — ${selected?.full_name}`}
        onClose={() => setModal(null)}
      >
        {selected && (
          <EditClientForm
            client={selected}
            onSaved={() => { setModal(null); load(); }}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </Layout>
  );
}

// ── Painel de saldo de moedas ─────────────────────────────────────────────────
import { FormEvent, useEffect as useEffectFn } from 'react';
import { updateClient } from '../../api/clients';
import { listChests } from '../../api/chests';
import type { CoinChest } from '../../types';

function BalancePanel({
  client, transactions, subLoading, onAdded,
}: { client: Client; transactions: CoinTransaction[]; subLoading: boolean; onAdded: () => void }) {
  const [chests,     setChests]     = useState<CoinChest[]>([]);
  const [chestId,    setChestId]    = useState('');
  const [amount,     setAmount]     = useState('');
  const [desc,       setDesc]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [localGold,   setLocalGold]   = useState(client.coins_gold);
  const [localSilver, setLocalSilver] = useState(client.coins_silver);
  const [localBronze, setLocalBronze] = useState(client.coins_bronze);

  const COIN_ICONS: Record<string, string> = { gold: '🟡 Ouro', silver: '⚪ Prata', bronze: '🟤 Cobre' };

  useEffectFn(() => {
    listChests().then(list => setChests(list.filter(c => c.status === 'active')));
  }, []);

  const handleChestChange = (id: string) => {
    setChestId(id);
    if (!id) { setAmount(''); setDesc(''); return; }
    const chest = chests.find(c => String(c.id) === id);
    if (chest) { setAmount(String(chest.coin_amount)); setDesc(`Baú de ${chest.name}`); }
  };

  const selectedChest = chests.find(c => String(c.id) === chestId);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      swal.warning('Valor inválido', 'Informe uma quantidade de moedas positiva.');
      return;
    }
    setSaving(true);
    try {
      const r = await addClientBalance(client.id, Number(amount), selectedChest?.coin_type ?? 'gold', desc || undefined);
      if (r.coins_gold   !== undefined) setLocalGold(r.coins_gold);
      if (r.coins_silver !== undefined) setLocalSilver(r.coins_silver);
      if (r.coins_bronze !== undefined) setLocalBronze(r.coins_bronze);
      setAmount(''); setDesc(''); setChestId('');
      swal.success('Saldo adicionado!', 'O saldo foi creditado com sucesso.');
      onAdded();
    } catch (err: any) {
      swal.error('Erro ao adicionar saldo', err.response?.data?.error || 'Tente novamente.');
    } finally { setSaving(false); }
  };

  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14 }}>🟡 Ouro: <strong>{fmt(localGold)}</strong></div>
        <div style={{ fontSize: 14 }}>⚪ Prata: <strong>{fmt(localSilver)}</strong></div>
        <div style={{ fontSize: 14 }}>🟤 Cobre: <strong>{fmt(localBronze)}</strong></div>
      </div>

      <form onSubmit={handleAdd} className="admin-form">
        <div className="form-group">
          <label>Baú de Moedas</label>
          <select value={chestId} onChange={e => handleChestChange(e.target.value)}>
            <option value="">— Selecione um baú —</option>
            {chests.map(c => (
              <option key={c.id} value={String(c.id)}>
                {COIN_ICONS[c.coin_type] ?? c.coin_type} — {c.name} — {Number(c.coin_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} ({Number(c.price_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Quantidade de moedas <span className="req">*</span></label>
            <input type="number" step="0.0000001" min="0.0000001"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 9.0000000" required />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Baú de Cobre" />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : '+ Adicionar Saldo'}
          </button>
        </div>
      </form>

      <div>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Histórico de Transações</h4>
        {subLoading ? <p>Carregando...</p> : (
          <div className="modal-table-wrap">
            <table className="modal-table">
              <thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Descrição</th></tr></thead>
              <tbody>
                {transactions.length === 0
                  ? <tr><td colSpan={4} className="dt-empty">Nenhuma transação</td></tr>
                  : transactions.map(t => (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleString('pt-BR')}</td>
                      <td>
                        <span className={`badge ${t.type === 'admin_credit' ? 'badge-active' : t.type === 'chest_purchase' ? 'badge-inactive' : 'badge-blocked'}`}>
                          {t.type === 'admin_credit' ? 'Crédito' : t.type === 'chest_purchase' ? 'Compra de Baú' : 'Débito'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{t.type === 'admin_credit' ? '+' : ''}{Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 })}</td>
                      <td>{t.description ?? '-'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

function EditClientForm({
  client, onSaved, onCancel,
}: { client: Client; onSaved: () => void; onCancel: () => void }) {
  const [fullName,      setFullName]      = useState(client.full_name);
  const [iniciaticName, setIniciaticName] = useState(client.initiatic_name ?? '');
  const [email,         setEmail]         = useState(client.email);
  const [birthDate,     setBirthDate]     = useState(client.birth_date ?? '');
  const [birthTime,     setBirthTime]     = useState(client.birth_time ?? '');
  const [birthCountry,  setBirthCountry]  = useState(client.birth_country ?? '');
  const [birthState,    setBirthState]    = useState(client.birth_state ?? '');
  const [birthCity,     setBirthCity]     = useState(client.birth_city ?? '');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  const isBrazil = birthCountry.trim().toLowerCase() === 'brasil';

  function handleCountryChange(v: string) {
    setBirthCountry(v);
    setBirthState('');
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateClient(client.id, {
        full_name:      fullName,
        initiatic_name: iniciaticName || null,
        email,
        birth_date:     birthDate    || null,
        birth_time:     birthTime    || null,
        birth_country:  birthCountry || null,
        birth_state:    birthState   || null,
        birth_city:     birthCity    || null,
      } as Partial<Client>);
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="form-group">
        <label>Nome Completo</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Nome Iniciático <span style={{ fontWeight: 400, opacity: 0.7 }}>(opcional)</span></label>
        <input value={iniciaticName} placeholder="Ex.: Zephyrion Arcturiano" onChange={e => setIniciaticName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Data de Nascimento</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Hora de Nascimento <span style={{ fontWeight: 400, opacity: 0.7 }}>(hh:mm)</span></label>
          <input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>País de Nascimento</label>
        <input value={birthCountry} placeholder="Ex.: Brasil, Portugal, Argentina…"
               onChange={e => handleCountryChange(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Estado</label>
          {isBrazil ? (
            <select value={birthState} onChange={e => setBirthState(e.target.value)}>
              <option value="">Selecione…</option>
              {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={birthState} placeholder="Estado / Província"
                   onChange={e => setBirthState(e.target.value)} />
          )}
        </div>
        <div className="form-group">
          <label>Cidade</label>
          <input value={birthCity} placeholder="Cidade"
                 onChange={e => setBirthCity(e.target.value)} />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
