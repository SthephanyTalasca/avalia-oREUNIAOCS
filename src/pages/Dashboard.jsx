// Dashboard V2 — Light Premium · dados reais da API
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import KpiCards      from '../components/dashboard/KpiCards.jsx';
import RiskRadar     from '../components/dashboard/RiskRadar.jsx';
import CsLeaderboard from '../components/dashboard/CsLeaderboard.jsx';
import ActionFeed    from '../components/dashboard/ActionFeed.jsx';

const PERIODS = [
  { label: '7d',   value: '7' },
  { label: '30d',  value: '30' },
  { label: '90d',  value: '90' },
  { label: 'Tudo', value: 'todos' },
];

const TABS = [
  {
    key: 'risco',
    label: 'Riscos & Oportunidades',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    key: 'ranking',
    label: 'Ranking CS',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'feed',
    label: 'Feed de Ações',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-white border border-nibo-ice" />
        ))}
      </div>
      <div className="h-10 rounded-xl bg-white border border-nibo-ice" />
      <div className="h-72 rounded-xl bg-white border border-nibo-ice" />
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
  const [activeTab,   setActiveTab]   = useState('risco');

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

  const coordinators = useMemo(() => {
    const keys = Object.keys(raw?.stats?.porCoordenador || {}).filter(k => k && k !== 'null' && k !== 'undefined');
    return keys.sort();
  }, [raw]);

  const hasData = !loading && !error && data?.stats;

  return (
    <div className="min-h-screen bg-nibo-bg">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-nibo-text">
              Dashboard{' '}
              <span className="text-nibo-gradient">CS</span>
            </h1>
            <p className="text-nibo-muted text-sm mt-0.5">
              Performance em tempo real baseada nas reuniões avaliadas por IA
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
          <div className="nibo-card rounded-xl p-6 text-center"
               style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
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
            {/* KPI Cards */}
            <KpiCards stats={data.stats} />

            {/* Abas */}
            <div className="flex gap-0 border-b border-nibo-ice">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? 'border-nibo-purple text-nibo-purple'
                      : 'border-transparent text-nibo-muted hover:text-nibo-text'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo de cada aba */}
            {activeTab === 'risco'   && <RiskRadar    reunioes={data.reunioes} />}
            {activeTab === 'ranking' && <CsLeaderboard ranking={data.stats.ranking} />}
            {activeTab === 'feed'    && <ActionFeed   reunioes={data.reunioes} stats={data.stats} />}
          </>
        )}
      </div>
    </div>
  );
}
