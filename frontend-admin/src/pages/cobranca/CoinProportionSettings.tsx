import { useEffect, useState, FormEvent } from 'react';
import Layout from '../../components/Layout';
import { listCoinProportions, updateCoinProportion } from '../../api/coinProportions';
import type { CoinProportion, CoinType } from '../../types';
import { swal } from '../../utils/swal';

const LABELS: Record<CoinType, string> = { gold: 'Ouro', silver: 'Prata', bronze: 'Cobre' };
const ICONS:  Record<CoinType, string> = { gold: '🟡', silver: '⚪', bronze: '🟤' };

export default function CoinProportionSettings() {
  const [proportions, setProportions] = useState<CoinProportion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CoinType | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listCoinProportions().then(setProportions).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (p: CoinProportion) => {
    setEditing(p.coin_type);
    setValue(String(p.cost_per_message));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateCoinProportion(editing, parseFloat(value));
      swal.success(`Proporção de ${LABELS[editing]} atualizada!`);
      setEditing(null);
      load();
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally { setSaving(false); }
  };

  return (
    <Layout title="Cobrança — Proporção de Cobrança">
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <h2>Proporção de Cobrança por Mensagem</h2>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Define quantas moedas de cada tipo são debitadas por chamada ao agente.
          </p>

          {loading ? <p>Carregando...</p> : (
            <table className="modal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Custo por Mensagem</th>
                  <th>Última Atualização</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {proportions.map(p => (
                  <tr key={p.coin_type}>
                    <td><strong>{ICONS[p.coin_type]} {LABELS[p.coin_type]}</strong></td>
                    <td>
                      {editing === p.coin_type ? (
                        <form onSubmit={handleSave} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number" step="0.0000001" min="0.0000001"
                            value={value} onChange={e => setValue(e.target.value)}
                            style={{ width: 130 }} required
                          />
                          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '4px 12px', fontSize: 12 }}>
                            {saving ? '...' : 'Salvar'}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)} style={{ padding: '4px 12px', fontSize: 12 }}>
                            Cancelar
                          </button>
                        </form>
                      ) : (
                        <span>{Number(p.cost_per_message).toLocaleString('pt-BR', { minimumFractionDigits: 7 })}</span>
                      )}
                    </td>
                    <td>{new Date(p.updated_at).toLocaleString('pt-BR')}</td>
                    <td>
                      {editing !== p.coin_type && (
                        <button className="btn-icon btn-edit" title="Editar" onClick={() => startEdit(p)}>✎</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>
    </Layout>
  );
}
