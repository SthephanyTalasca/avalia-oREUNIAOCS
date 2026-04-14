// Dashboard V3 — Novo design + dados reais da API (critérios de avaliação preservados)
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Award, Calendar, ArrowUpRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Constantes ─────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '7d',   value: '7' },
  { label: '30d',  value: '30' },
  { label: '90d',  value: '90' },
  { label: 'Tudo', value: 'todos' },
];

const PILLARS = [
  'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
  'rapport','autoridade','postura','gestao_tempo','contextualizacao',
  'clareza','objetividade','flexibilidade','dominio_produto','dominio_negocio',
  'ecossistema_nibo','universo_contabil',
];

const PT = {
  consultividade:   'Consultividade',
  escuta_ativa:     'Escuta Ativa',
  jornada_cliente:  'Jornada',
  encantamento:     'Encantamento',
  objecoes:         'Objeções',
  rapport:          'Rapport',
  autoridade:       'Autoridade',
  postura:          'Postura',
  gestao_tempo:     'Gestão Tempo',
  contextualizacao: 'Contextualização',
  clareza:          'Clareza',
  objetividade:     'Objetividade',
  flexibilidade:    'Flexibilidade',
  dominio_produto:  'Dom. Produto',
  dominio_negocio:  'Dom. Negócio',
  ecossistema_nibo: 'Ecossistema',
  universo_contabil:'Univ. Contábil',
};

function mapHealth(saude) {
  if (!saude) return 'Atenção';
  const s = saude.toLowerCase();
  if (/saud[aá]vel|ótim|otim|positiv|excelen/.test(s)) return 'Saudável';
  if (/cr[ií]tico|ruim|negativ|péssim/.test(s)) return 'Crítico';
  return 'Atenção';
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white border border-nibo-ice" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-72 rounded-2xl bg-white border border-nibo-ice" />
        <div className="h-72 rounded-2xl bg-white border border-nibo-ice" />
      </div>
      <div className="h-64 rounded-2xl bg-white border border-nibo-ice" />
    </div>
  );
}

// ── HighlightCard ──────────────────────────────────────────────────────────
const HIGHLIGHT_STYLES = {
  purple: { background: 'rgba(100,49,226,0.08)', borderColor: 'rgba(100,49,226,0.20)', color: '#6431e2' },
  pink:   { background: 'rgba(255,64,179,0.08)', borderColor: 'rgba(255,64,179,0.20)', color: '#ff40b3' },
  blue:   { background: 'rgba(0,114,206,0.08)',  borderColor: 'rgba(0,114,206,0.20)',  color: '#0072ce' },
};

function HighlightCard({ title, value, subtitle, icon: Icon, color }) {
  const s = HIGHLIGHT_STYLES[color];
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#d8e2f0] shadow-[0_4px_20px_-2px_rgba(0,45,114,0.08)] flex items-start gap-4 transition-transform duration-200 hover:-translate-y-1 cursor-default">
      <div className="p-3 rounded-xl border flex-shrink-0" style={s}>
        <Icon className="w-6 h-6" style={{ color: s.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-xl font-bold text-nibo-petroleo mb-1 truncate">{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [raw,         setRaw]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [period,      setPeriod]      = useState('30');
  const [coordinator, setCoordinator] = useState('todos');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ periodo: period });
    if (coordinator !== 'todos') p.set('coordenador', coordinator);
    fetch(`/api/dashboard?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setRaw(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [period, coordinator]);

  // Enriquece ranking com avg_talk_cs (preservado do V2)
  const data = useMemo(() => {
    if (!raw?.stats?.ranking || !raw?.reunioes) return raw;
    const ranking = raw.stats.ranking.map(a => {
      const meets = raw.reunioes.filter(r => r.analista_nome === a.nome);
      const talks = meets.map(r => parseInt(r.tempo_fala_cs) || null).filter(v => v !== null);
      const avgTalk = talks.length
        ? Math.round(talks.reduce((s, v) => s + v, 0) / talks.length)
        : null;
      return { ...a, avg_talk_cs: avgTalk };
    });
    return { ...raw, stats: { ...raw.stats, ranking } };
  }, [raw]);

  // Coordenadores disponíveis para filtro
  const coordinators = useMemo(() => {
    const keys = Object.keys(raw?.stats?.porCoordenador || {})
      .filter(k => k && k !== 'null' && k !== 'undefined');
    return keys.sort();
  }, [raw]);

  // Contagem de risco churn alto por analista
  const churnByCS = useMemo(() => {
    if (!data?.reunioes) return {};
    const map = {};
    for (const r of data.reunioes) {
      const key = r.analista_nome;
      if (!key) continue;
      if (/\balto\b|\bcr[ií]tico\b/i.test(r.risco_churn || '')) {
        map[key] = (map[key] || 0) + 1;
      }
    }
    return map;
  }, [data]);

  // Média por categoria (agrupada do ranking)
  const teamStats = useMemo(() => {
    if (!data?.stats?.ranking?.length) return [];
    return PILLARS
      .map(p => {
        const vals = data.stats.ranking
          .map(a => a[`avg_${p}`] || 0)
          .filter(v => v > 0);
        return {
          category: PT[p],
          score: vals.length
            ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
            : 0,
        };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [data]);

  // Destaques
  const topByScore  = useMemo(() =>
    [...(data?.stats?.ranking || [])].sort((a, b) => b.media - a.media)[0],
  [data]);
  const topByVolume = useMemo(() =>
    [...(data?.stats?.ranking || [])].sort((a, b) => b.total - a.total)[0],
  [data]);

  // Últimas 5 reuniões
  const recentMeetings = useMemo(() => {
    if (!data?.reunioes?.length) return [];
    return [...data.reunioes]
      .sort((a, b) =>
        new Date(b.data_reuniao || b.created_at || 0) -
        new Date(a.data_reuniao || a.created_at || 0)
      )
      .slice(0, 5);
  }, [data]);

  const hasData       = !loading && !error && data?.stats;
  const bestCategory  = teamStats[0]?.category;
  const worstCategory = teamStats[teamStats.length - 1]?.category;

  return (
    <div className="min-h-screen bg-nibo-bg">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-nibo-text">
              Dashboard de Performance
            </h2>
            <p className="text-nibo-muted text-sm mt-0.5">
              Visão geral da qualidade do atendimento do time de CS.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de período */}
            <div className="flex items-center bg-white rounded-xl p-1 gap-0.5 border border-nibo-ice">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p.value
                      ? 'text-white shadow-sm'
                      : 'text-nibo-muted hover:text-nibo-text hover:bg-nibo-bg'
                  }`}
                  style={period === p.value ? { background: 'var(--nibo-purple)' } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filtro coordenador */}
            {coordinators.length > 0 && (
              <select
                value={coordinator}
                onChange={e => setCoordinator(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-nibo-ice bg-white text-nibo-text focus:outline-none focus:ring-2 cursor-pointer"
                style={{ '--tw-ring-color': 'rgba(100,49,226,0.25)' }}
              >
                <option value="todos">Todos coordenadores</option>
                {coordinators.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* CTA Nova Análise */}
            <Link
              to="/analise"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#6431e2,#41b6e6)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              Nova Análise
            </Link>
          </div>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && <Skeleton />}

        {/* ── Erro ─────────────────────────────────────────────────────── */}
        {error && (
          <div
            className="nibo-card rounded-xl p-6 text-center"
            style={{ borderColor: '#fca5a5', background: '#fff5f5' }}
          >
            <p className="text-red-600 font-semibold text-sm">Erro ao carregar dados: {error}</p>
          </div>
        )}

        {/* ── Vazio ────────────────────────────────────────────────────── */}
        {!loading && !error && !data?.stats && (
          <div className="nibo-card rounded-xl p-16 text-center">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-nibo-text font-semibold">Nenhuma reunião neste período.</p>
            <p className="text-nibo-muted text-sm mt-1">
              Tente um período maior ou analise uma nova reunião.
            </p>
          </div>
        )}

        {/* ── Conteúdo ─────────────────────────────────────────────────── */}
        {hasData && (
          <>
            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HighlightCard
                title="Média Geral do Time"
                value={data.stats.media_geral ? `${data.stats.media_geral.toFixed(1)}/5` : '—'}
                subtitle={`${data.stats.total || 0} reuniões no período`}
                icon={TrendingUp}
                color="purple"
              />
              <HighlightCard
                title="Destaque em Nota"
                value={topByScore?.nome?.split(' ')[0] || '—'}
                subtitle={topByScore?.media > 0 ? `Nota: ${topByScore.media.toFixed(1)}` : '—'}
                icon={Award}
                color="pink"
              />
              <HighlightCard
                title="Destaque em Volume"
                value={topByVolume?.nome?.split(' ')[0] || '—'}
                subtitle={topByVolume ? `${topByVolume.total} reuniões realizadas` : '—'}
                icon={Users}
                color="blue"
              />
            </div>

            {/* Grid 2 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* CS Ranking */}
              <section className="bg-white rounded-2xl border border-[#d8e2f0] shadow-[0_4px_20px_-2px_rgba(0,45,114,0.08)] overflow-hidden">
                <div className="p-6 border-b border-[#d8e2f0]/60 flex items-center gap-2">
                  <Users className="w-5 h-5 text-nibo-blue" />
                  <h3 className="font-bold text-nibo-petroleo">Ranking de CSs</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-nibo-bg/40">
                        {['CS', 'Nota', 'Reuniões', 'Risco Churn'].map(h => (
                          <th
                            key={h}
                            className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                              h !== 'CS' ? 'text-center' : ''
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d8e2f0]/40">
                      {data.stats.ranking.map((cs) => {
                        const churnCount = churnByCS[cs.nome] || 0;
                        return (
                          <tr key={cs.nome} className="hover:bg-nibo-bg/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-nibo-text">{cs.nome}</div>
                              {cs.coordenador && (
                                <div className="text-[11px] text-nibo-muted">{cs.coordenador}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                cs.media >= 4.5 ? 'bg-emerald-100 text-emerald-700' :
                                cs.media >= 4.0 ? 'bg-blue-50 text-nibo-blue' :
                                cs.media >= 3.0 ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-600'
                              }`}>
                                {cs.media > 0 ? cs.media.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-slate-600">
                              {cs.total}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                churnCount > 5 ? 'bg-red-50 text-red-600' :
                                churnCount > 0 ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {churnCount}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Pontuação por Categoria */}
              <section className="bg-white rounded-2xl border border-[#d8e2f0] shadow-[0_4px_20px_-2px_rgba(0,45,114,0.08)] p-6">
                <h3 className="font-bold text-nibo-petroleo mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-nibo-blue" />
                  Pontuação Geral do Time por Categoria
                </h3>
                {teamStats.length > 0 ? (
                  <>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamStats} layout="vertical" margin={{ left: 20, right: 30 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            vertical={true}
                            stroke="#f1f5f9"
                          />
                          <XAxis type="number" domain={[0, 5]} hide />
                          <YAxis
                            dataKey="category"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                            width={115}
                          />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={v => [v.toFixed(2), 'Média']}
                          />
                          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
                            {teamStats.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.score >= 4.5 ? '#0072ce' : '#6431e2'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {bestCategory && worstCategory && bestCategory !== worstCategory && (
                      <div className="mt-4 p-4 bg-nibo-bg/50 rounded-xl border border-[#d8e2f0]/40">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-bold text-nibo-text">Insight:</span> O time performa melhor em{' '}
                          <span className="font-bold" style={{ color: '#6431e2' }}>{bestCategory}</span> e precisa de melhoria em{' '}
                          <span className="font-bold" style={{ color: '#6431e2' }}>{worstCategory}</span>.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-nibo-muted text-sm">
                    Dados de categorias insuficientes
                  </div>
                )}
              </section>
            </div>

            {/* Reuniões Recentes */}
            <section className="bg-white rounded-2xl border border-[#d8e2f0] shadow-[0_4px_20px_-2px_rgba(0,45,114,0.08)] overflow-hidden">
              <div className="p-6 border-b border-[#d8e2f0]/60 flex justify-between items-center">
                <h3 className="font-bold text-nibo-petroleo flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-nibo-blue" />
                  Histórico de Reuniões Recentes
                </h3>
                <Link
                  to="/history"
                  className="text-xs font-bold hover:underline flex items-center gap-1"
                  style={{ color: '#6431e2' }}
                >
                  Ver todas <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-nibo-bg/40">
                      {['Cliente', 'CS', 'Data', 'Nota', 'Saúde'].map(h => (
                        <th
                          key={h}
                          className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${
                            ['Nota', 'Saúde'].includes(h) ? 'text-center' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d8e2f0]/40">
                    {recentMeetings.map((r) => {
                      const health = mapHealth(r.saude_cliente);
                      return (
                        <tr
                          key={r.id || r.reuniao_id || r.created_at}
                          className="hover:bg-nibo-bg/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-nibo-text">
                              {r.nome_cliente || 'Cliente não identificado'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {(r.analista_nome || '—').split(' ')[0]}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {fmtDate(r.data_reuniao || r.created_at)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-nibo-text">
                              {r.media_final > 0 ? r.media_final.toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              health === 'Saudável' ? 'bg-emerald-100 text-emerald-700' :
                              health === 'Atenção'  ? 'bg-amber-50 text-amber-700' :
                                                     'bg-red-50 text-red-600'
                            }`}>
                              {health}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {recentMeetings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-nibo-muted text-sm">
                          Nenhuma reunião encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
