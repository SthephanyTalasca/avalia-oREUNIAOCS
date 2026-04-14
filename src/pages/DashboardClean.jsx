/**
 * DashboardClean.jsx — Visão Macro do CS
 * Deps: lucide-react, recharts, tailwindcss
 * Renomeie para Dashboard.tsx e adicione tipos se usar TypeScript
 */
import { useState } from 'react';
import {
  Video, Star, CheckCircle, AlertTriangle, Search,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ── Mock Data ──────────────────────────────────────────────────────────────
const MEETINGS = [
  { id: '1',  date: '10/04/2026', client: 'Escritório Marques & Associados', analyst: 'Sthephany T.', score: 4.2, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '2',  date: '09/04/2026', client: 'Contabilidade Pinheiro Ltda',     analyst: 'Denis S.',      score: 2.8, health: 'Crítico',   feedbackStatus: 'Pendente'   },
  { id: '3',  date: '08/04/2026', client: 'BDO Brasil Contadores',           analyst: 'Larissa T.',    score: 4.7, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '4',  date: '07/04/2026', client: 'JB Escritório Fiscal',            analyst: 'Sthephany T.', score: 3.4, health: 'Atenção',   feedbackStatus: 'Aguardando' },
  { id: '5',  date: '07/04/2026', client: 'Contábil Prime Soluções',         analyst: 'Yuri S.',       score: 4.1, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '6',  date: '06/04/2026', client: 'Mega Contábil SP',                analyst: 'Willian M.',    score: 1.9, health: 'Crítico',   feedbackStatus: 'Pendente'   },
  { id: '7',  date: '05/04/2026', client: 'Escritório Santos & Lima',        analyst: 'Thais S.',      score: 4.5, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '8',  date: '04/04/2026', client: 'Alpha Gestão Contábil',           analyst: 'Denis S.',      score: 3.1, health: 'Atenção',   feedbackStatus: 'Aguardando' },
  { id: '9',  date: '03/04/2026', client: 'Contábil Express LTDA',           analyst: 'Micaelle M.',   score: 4.8, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '10', date: '02/04/2026', client: 'Fiscal Master Group',             analyst: 'Lorrayne M.',   score: 2.5, health: 'Crítico',   feedbackStatus: 'Pendente'   },
  { id: '11', date: '01/04/2026', client: 'Studio Contábil Norte',           analyst: 'Larissa T.',    score: 4.3, health: 'Saudável',  feedbackStatus: 'Respondido' },
  { id: '12', date: '31/03/2026', client: 'Grupo Fiscal Meridian',           analyst: 'Yuri S.',       score: 3.7, health: 'Atenção',   feedbackStatus: 'Aguardando' },
];

const EVOLUTION = [
  { week: '17/03', Sthephany: 3.8, Denis: 4.1, Larissa: 3.5, Yuri: 3.9 },
  { week: '24/03', Sthephany: 4.0, Denis: 3.9, Larissa: 3.8, Yuri: 4.2 },
  { week: '31/03', Sthephany: 4.2, Denis: 4.3, Larissa: 4.0, Yuri: 3.8 },
  { week: '07/04', Sthephany: 3.9, Denis: 4.1, Larissa: 4.2, Yuri: 4.4 },
];

const ANALYSTS       = ['Sthephany', 'Denis', 'Larissa', 'Yuri'];
const ANALYST_COLORS = ['#8b5cf6',   '#0ea5e9', '#10b981',  '#f59e0b'];

// ── Atoms ──────────────────────────────────────────────────────────────────
function HealthPill({ status }) {
  const map = {
    Saudável: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Atenção:  'bg-amber-50   text-amber-700   border border-amber-100',
    Crítico:  'bg-rose-50    text-rose-700    border border-rose-100',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? map.Atenção}`}>
      {status}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Respondido: 'bg-slate-100 text-slate-600',
    Pendente:   'bg-amber-50  text-amber-600',
    Aguardando: 'bg-sky-50    text-sky-600',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${map[status] ?? map.Pendente}`}>
      {status}
    </span>
  );
}

function ScoreChip({ score }) {
  let cls = 'bg-emerald-50 text-emerald-600';
  if (score < 3)      cls = 'bg-rose-50  text-rose-600';
  else if (score < 4) cls = 'bg-amber-50 text-amber-600';
  return (
    <span className={`inline-flex items-center justify-center w-14 h-7 rounded-lg text-sm font-bold ${cls}`}>
      {score.toFixed(1)}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-start justify-between gap-4">
      <div className="space-y-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.8} />
        </div>
        <p className="text-sm font-medium text-slate-500 leading-tight">{label}</p>
      </div>
      <span className="text-4xl font-black text-slate-900 mt-0.5 tabular-nums">{value}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-4 text-sm">
      <p className="text-slate-400 font-semibold mb-2 text-xs uppercase tracking-wide">Semana {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600 min-w-[80px]">{p.name}</span>
          <span className="font-bold ml-auto" style={{ color: p.color }}>
            {Number(p.value).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DashboardClean() {
  const [search, setSearch] = useState('');

  const total     = MEETINGS.length;
  const avg       = (MEETINGS.reduce((s, m) => s + m.score, 0) / total).toFixed(1);
  const highCount = MEETINGS.filter(m => m.score >= 4).length;
  const lowCount  = MEETINGS.filter(m => m.score < 3).length;

  const filtered = MEETINGS.filter(m =>
    m.client.toLowerCase().includes(search.toLowerCase()) ||
    m.analyst.toLowerCase().includes(search.toLowerCase()),
  );

  const kpis = [
    { label: 'Total de Reuniões',  value: total,     icon: Video,         iconBg: 'bg-violet-50',  iconColor: 'text-violet-500'  },
    { label: 'Média Geral (IA)',   value: avg,        icon: Star,          iconBg: 'bg-amber-50',   iconColor: 'text-amber-500'   },
    { label: 'Notas ≥ 4',         value: highCount,  icon: CheckCircle,   iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Notas < 3',         value: lowCount,   icon: AlertTriangle, iconBg: 'bg-rose-50',    iconColor: 'text-rose-500'    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard de Sucesso CS
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Visão macro das reuniões avaliadas por IA · Abril 2026
          </p>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
        </div>

        {/* ── Line Chart ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">
              Evolução das Notas por Analista
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Média semanal · últimas 4 semanas
            </p>
          </div>
          <ResponsiveContainer width="100%" height={268}>
            <LineChart data={EVOLUTION} margin={{ top: 4, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                domain={[1, 5]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickCount={5}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ paddingTop: 16 }}
                formatter={v => (
                  <span style={{ color: '#64748b', fontSize: 12 }}>{v}</span>
                )}
              />
              {ANALYSTS.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={ANALYST_COLORS[i]}
                  strokeWidth={2}
                  dot={{ fill: ANALYST_COLORS[i], strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          {/* Table header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-slate-50">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Últimas Reuniões</h2>
              <p className="text-sm text-slate-400 mt-0.5">{MEETINGS.length} reuniões no período</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar cliente ou analista..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300
                           w-64 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Data', 'Cliente', 'Analista', 'Nota IA', 'Saúde do Cliente', 'Feedback'].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400
                                 uppercase tracking-wider border-b border-slate-50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                      i < filtered.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{m.date}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{m.client}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{m.analyst}</td>
                    <td className="px-6 py-4"><ScoreChip score={m.score} /></td>
                    <td className="px-6 py-4"><HealthPill status={m.health} /></td>
                    <td className="px-6 py-4"><StatusBadge status={m.feedbackStatus} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      Nenhuma reunião encontrada para "{search}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
