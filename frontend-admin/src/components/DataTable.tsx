import { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  actions?: (row: T) => React.ReactNode;
}

type SortDir = 'asc' | 'desc';

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, loading, actions,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1); };

  const from = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to   = Math.min(safePage * perPage, sorted.length);

  return (
    <div className="dt-wrap">
      <div className="dt-controls">
        <div className="dt-per-page">
          <select value={perPage} onChange={e => handlePerPage(Number(e.target.value))}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>registros por página</span>
        </div>
        <div className="dt-search">
          <label>Buscar:</label>
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar..." />
        </div>
      </div>

      <div className="dt-table-wrap">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className={`sort-icon ${sortKey === col.key ? sortDir : ''}`}>⇅</span>
                  )}
                </th>
              ))}
              {actions && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="dt-empty">Carregando...</td></tr>
            ) : slice.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="dt-empty">Nenhum registro encontrado</td></tr>
            ) : slice.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row) : String(row[col.key] ?? '')}</td>
                ))}
                {actions && <td className="dt-actions">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dt-footer">
        <span className="dt-info">
          {sorted.length === 0
            ? 'Nenhum registro'
            : `Mostrando ${from} a ${to} de ${sorted.length} registros`}
        </span>
        <div className="dt-pagination">
          <button onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(totalPages - 4, safePage - 2)) + i;
            return (
              <button
                key={p}
                className={safePage === p ? 'active' : ''}
                onClick={() => setPage(p)}
              >{p}</button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
        </div>
      </div>
    </div>
  );
}
