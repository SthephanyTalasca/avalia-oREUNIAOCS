// Dashboard V1 — Dark Premium · dados reais da API
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

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="h-72 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-80 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div className="h-[600px] rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
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

  // Busca dados
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

  // Enriquece ranking com talk ratio médio calculado a partir das reuniões
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
    const keys = Object.keys(raw?.stats?.porCoordenador || {}).filter(k => k && k !== 'null' && k !== 'undefined');
    return keys.sort();
  }, [raw]);

  const hasData = !loading && !error && data?.stats;

  return (
    <div className="min-h-screen text-white" style={{ background: '#0f172a' }}>
      {/* Mesh de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10"
             style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full blur-3xl opacity-10"
             style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-8"
             style={{ background: 'radial-gradient(circle,#0ea5e9,transparent)' }} />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Dashboard{' '}
              <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg,#8b5cf6,#6366f1)' }}>
                CS
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Performance em tempo real baseada nas reuniões avaliadas por IA
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Período */}
            <div className="flex items-center rounded-xl p-1 gap-0.5"
                 style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p.value
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Coordenador */}
            {coordinators.length > 0 && (
              <select
                value={coordinator}
                onChange={e => setCoordinator(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer text-slate-300"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <option value="todos">Todos coordenadores</option>
                {coordinators.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Link para Nova Análise */}
            <Link
              to="/analise"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
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
          <div className="rounded-2xl p-6 text-center"
               style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 font-semibold text-sm">Erro ao carregar dados: {error}</p>
          </div>
        )}

        {/* ── Vazio ────────────────────────────────────────────────────── */}
        {!loading && !error && !data?.stats && (
          <div className="rounded-2xl p-16 text-center"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-5xl mb-4">📭</p>
            <p className="text-slate-300 font-semibold">Nenhuma reunião neste período.</p>
            <p className="text-slate-500 text-sm mt-1">Tente um período maior ou analise uma nova reunião.</p>
          </div>
        )}

        {/* ── Conteúdo ─────────────────────────────────────────────────── */}
        {hasData && (
          <>
            <KpiCards stats={data.stats} />

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Coluna principal */}
              <div className="space-y-6">
                <RiskRadar reunioes={data.reunioes} />
                <CsLeaderboard ranking={data.stats.ranking} />
              </div>

              {/* Feed lateral */}
              <ActionFeed reunioes={data.reunioes} stats={data.stats} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
