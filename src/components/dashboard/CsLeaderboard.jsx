// CsLeaderboard V2 — Light theme · ranking de performance
const PILLARS = [
  'consultividade','escuta_ativa','jornada_cliente','encantamento','objecoes',
  'rapport','autoridade','postura','gestao_tempo','contextualizacao',
  'clareza','objetividade','flexibilidade','dominio_produto','dominio_negocio',
  'ecossistema_nibo','universo_contabil',
];
const PT = {
  consultividade:   'Consultividade', escuta_ativa: 'Escuta Ativa',
  jornada_cliente:  'Jornada',        encantamento: 'Encantamento',
  objecoes:         'Objeções',       rapport:      'Rapport',
  autoridade:       'Autoridade',     postura:      'Postura',
  gestao_tempo:     'Gestão Tempo',   contextualizacao: 'Contextualização',
  clareza:          'Clareza',        objetividade: 'Objetividade',
  flexibilidade:    'Flexibilidade',  dominio_produto: 'Dom. Produto',
  dominio_negocio:  'Dom. Negócio',   ecossistema_nibo: 'Ecossistema',
  universo_contabil:'Univ. Contábil',
};

function scoreColor(v) {
  if (!v || v === 0) return '#94a3b8';
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
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
      <div className="progress-track flex-1 h-2" style={{ minWidth: 56 }}>
        <div
          className="progress-fill h-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TalkBadge({ value }) {
  if (value == null) return <span className="text-nibo-muted text-sm">—</span>;
  const balanced = value >= 40 && value <= 55;
  return (
    <span className={`badge ${balanced ? 'badge-emerald' : 'badge-amber'}`}>
      {value}%
    </span>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function CsLeaderboard({ ranking }) {
  if (!ranking?.length) return null;

  return (
    <div className="nibo-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-nibo-ice flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(245,158,11,0.12)' }}>
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-nibo-text">Ranking de Performance CS</h3>
          <p className="text-[11px] text-nibo-muted">Nota média ponderada pelas avaliações de IA</p>
        </div>
        <span className="ml-auto badge badge-gray">
          {ranking.length} analista{ranking.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nibo-ice bg-nibo-bg/50">
              {['#', 'CS', 'MHS', 'Reuniões', 'Talk Ratio', 'Ponto Forte', 'A Melhorar'].map(h => (
                <th key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-nibo-muted whitespace-nowrap">
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
                <tr key={a.nome}
                    className="border-b border-nibo-ice/50 hover:bg-nibo-bg/60 transition-colors">
                  {/* Rank */}
                  <td className="px-4 py-3 font-black text-base">
                    {i < 3 ? MEDAL[i] : (
                      <span className="text-nibo-muted text-sm font-bold">{i + 1}°</span>
                    )}
                  </td>

                  {/* Nome */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-nibo-text">{firstName}</p>
                    <p className="text-[11px] text-nibo-muted">{a.coordenador || '—'}</p>
                  </td>

                  {/* MHS */}
                  <td className="px-4 py-3 min-w-[140px]">
                    {a.media > 0
                      ? <MhsBar value={a.media} />
                      : <span className="text-nibo-muted">—</span>}
                  </td>

                  {/* Reuniões */}
                  <td className="px-4 py-3 text-center font-semibold text-nibo-text">{a.total}</td>

                  {/* Talk Ratio */}
                  <td className="px-4 py-3 text-center">
                    <TalkBadge value={a.avg_talk_cs} />
                  </td>

                  {/* Forte */}
                  <td className="px-4 py-3">
                    {strong
                      ? <span className="badge badge-emerald">↑ {PT[strong]}</span>
                      : <span className="text-nibo-muted">—</span>}
                  </td>

                  {/* Fraco */}
                  <td className="px-4 py-3">
                    {weak && weak !== strong
                      ? <span className="badge badge-red">↓ {PT[weak]}</span>
                      : <span className="text-nibo-muted">—</span>}
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
