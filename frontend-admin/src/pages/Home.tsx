import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line, Legend,
} from 'recharts';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface DashboardData {
  summary: {
    total_clients:  number;
    total_children: number;
    total_revenue:  number;
    total_orders:   number;
  };
  top_modules:            { name: string; sessions: number }[];
  top_packages:           { label: string; purchases: number; revenue: number }[];
  registrations_by_month: { month: string; clients: number; children: number }[];
  orders_by_month:        { month: string; orders: number; revenue: number }[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m) - 1]}/${y.slice(2)}`;
};

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,.07)', borderTop: `4px solid ${color}`,
      flex: 1, minWidth: 180,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
    </div>
  );
}

/* ── Chart Card ──────────────────────────────────────────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,.07)',
    }}>
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>{title}</p>
      {children}
    </div>
  );
}

/* ── Custom tooltip para faturamento ─────────────────────────────────────── */
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#374151' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? fmtBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  purple:     '#7c3aed',
  purpleLight:'#ede9fe',
  blue:       '#2563eb',
  blueLight:  '#dbeafe',
  green:      '#16a34a',
  greenLight: '#dcfce7',
  amber:      '#d97706',
  amberLight: '#fef3c7',
  teal:       '#0d9488',
  pink:       '#db2777',
};

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(r => setData(r.data))
      .catch(() => setError('Não foi possível carregar os dados do dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Dashboard">
      {/* Boas-vindas */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Resumo geral da plataforma Mahamatrix.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando dashboard…</div>
      )}
      {error && (
        <div style={{ padding: 16, background: '#fef2f2', color: '#dc2626', borderRadius: 8 }}>{error}</div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── KPIs ── */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <KpiCard label="Clientes Cadastrados" value={data.summary.total_clients.toLocaleString('pt-BR')}  color={C.purple} />
            <KpiCard label="Filhos Cadastrados"   value={data.summary.total_children.toLocaleString('pt-BR')} color={C.blue} />
            <KpiCard label="Pedidos Realizados"   value={data.summary.total_orders.toLocaleString('pt-BR')}   color={C.teal} />
            <KpiCard label="Total Faturado"        value={fmtBRL(data.summary.total_revenue)} sub="apenas pedidos concluídos" color={C.green} />
          </div>

          {/* ── Top Módulos + Top Pacotes ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

            <ChartCard title="Módulos Mais Utilizados (por sessões)">
              {data.top_modules.length === 0
                ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem dados ainda.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.top_modules} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: C.purpleLight }} formatter={(v: number) => [v, 'Sessões']} />
                      <Bar dataKey="sessions" name="Sessões" fill={C.purple} radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </ChartCard>

            <ChartCard title="Pacotes de Módulos Mais Adquiridos">
              {data.top_packages.length === 0
                ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem dados ainda.</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.top_packages} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: C.blueLight }} formatter={(v: number) => [v, 'Compras']} />
                      <Bar dataKey="purchases" name="Compras" fill={C.blue} radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </ChartCard>
          </div>

          {/* ── Registros por mês ── */}
          <ChartCard title="Novos Cadastros por Mês — Clientes e Filhos">
            {data.registrations_by_month.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem dados ainda.</p>
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.registrations_by_month.map(r => ({ ...r, month: fmtMonth(r.month) }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.purple} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gChildren" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.blue} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Area type="monotone" dataKey="clients"  name="Clientes" stroke={C.purple} fill="url(#gClients)"  strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="children" name="Filhos"   stroke={C.blue}   fill="url(#gChildren)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </ChartCard>

          {/* ── Pedidos e Faturamento por mês ── */}
          <ChartCard title="Pedidos Realizados e Faturamento por Mês">
            {data.orders_by_month.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem dados ainda.</p>
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={data.orders_by_month.map(r => ({ ...r, month: fmtMonth(r.month) }))}
                    margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left"  allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar    yAxisId="left"  dataKey="orders"  name="Pedidos"     fill={C.teal}  radius={[4, 4, 0, 0]} barSize={28} opacity={0.85} />
                    <Line   yAxisId="right" dataKey="revenue" name="Faturamento" stroke={C.green} strokeWidth={2.5} dot={{ r: 4 }} type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
              )
            }
          </ChartCard>

        </div>
      )}
    </Layout>
  );
}
