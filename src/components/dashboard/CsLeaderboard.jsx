// CsLeaderboard — ranking de performance com MHS, talk ratio e forte/fraco
const PILLARS = [
  'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
  'rapport','autoridade','postura','gestao_tempo','contextualizacao',
  'clareza','objetividade','flexibilidade','dominio_produto','dominio_negocio',
  'ecossistema_nibo','universo_contabil',
];
const PT = {
  consultividade: 'Consultividade', escuta_ativa: 'Escuta Ativa',
  jornada_cliente: 'Jornada', encantamento: 'Encantamento',
  objecoes: 'Objeções', rapport: 'Rapport', autoridade: 'Autoridade',
  postura: 'Postura', gestao_tempo: 'Gestão Tempo', contextualizacao: 'Contextualização',
  clareza: 'Clareza', objetividade: 'Objetividade', flexibilidade: 'Flexibilidade',
  dominio_produto: 'Dom. Produto', dominio_negocio: 'Dom. Negócio',
  ecossistema_nibo: 'Ecossistema', universo_contabil: 'Univ. Contábil',
};

function scoreColor(v) {
  if (!v || v === 0) return '#64748b';
  if (v >= 4.5) return '#10B981';
  if (v >= 4.0) return '#34d399';
  if (v >= 3.5) return '#f59e0b';
  if (v >= 3.0) return '#f97316';
  return '#ef4444';
}

function getStrongWeak(a) {
  const vals = PILLARS
    .map(p => ({ key: p, val: a[`avg_${p}`] || 0 }))
    .filter(p => p.val > 0)
    .sort((x, y) => y.val - x.val);
  return {
    strong: vals[0]?.key ?? null,
    weak:   vals[vals.length - 1]?.key ?? null,
  };
}

function MhsBar({ value }) {
  const pct   = Math.round((value / 5) * 100);
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-black w-8 text-right" style={{ color }}>{value.toFixed(1)}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden" style={{ minWidth: 56 }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease' }}
        />
      </div>
    </div>
  );
}

function TalkBadge({ value }) {
  if (value == null) return <span className="text-slate-600 text-sm">—</span>;
  const balanced = value >= 40 && value <= 55;
  return (
    <span
      className="text-xs font-bold"
      style={{ color: balanced ? '#10B981' : '#f59e0b' }}
    >
      {value}%
    </span>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

export default function CsLeaderboard({ ranking }) {
  if (!ranking?.length) return null;

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(245,158,11,0.15)' }}>
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Ranking de Performance CS</h3>
          <p className="text-[11px] text-slate-400">Nota média ponderada pelas avaliações de IA</p>
        </div>
        <span className="ml-auto text-[11px] text-slate-500 font-semibold">
          {ranking.length} analista{ranking.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['#', 'CS', 'MHS', 'Reuniões', 'Talk Ratio', 'Ponto Forte', 'A Melhorar'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((a, i) => {
              const { strong, weak } = getStrongWeak(a);
              const firstName = (a.nome || '').split(' ')[0];

              return (
                <tr key={a.nome} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  {/* Rank */}
                  <td className="px-4 py-3 font-black text-base" style={{ color: RANK_COLORS[i] ?? '#475569' }}>
                    {i < 3 ? MEDAL[i] : `${i + 1}°`}
                  </td>

                  {/* Nome */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{firstName}</p>
                    <p className="text-[11px] text-slate-500">{a.coordenador || '—'}</p>
                  </td>

                  {/* MHS */}
                  <td className="px-4 py-3 min-w-[140px]">
                    {a.media > 0 ? <MhsBar value={a.media} /> : <span className="text-slate-600">—</span>}
                  </td>

                  {/* Reuniões */}
                  <td className="px-4 py-3 text-center font-semibold text-slate-300">{a.total}</td>

                  {/* Talk Ratio */}
                  <td className="px-4 py-3 text-center">
                    <TalkBadge value={a.avg_talk_cs} />
                  </td>

                  {/* Forte */}
                  <td className="px-4 py-3">
                    {strong ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        ↑ {PT[strong]}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>

                  {/* Fraco */}
                  <td className="px-4 py-3">
                    {weak && weak !== strong ? (
                      <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        ↓ {PT[weak]}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
