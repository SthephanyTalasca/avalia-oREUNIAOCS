// ActionFeed V2 — Light theme · feed de prescrições por prioridade
function relTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'hoje';
  if (d === 1) return 'ontem';
  if (d < 7)  return `${d}d atrás`;
  if (d < 30) return `${Math.floor(d / 7)}sem atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const PRIORITY = { urgent: 0, critical: 1, low_score: 2, opportunity: 3, product: 4 };

const TYPE_META = {
  urgent:      { bg: '#fff5f5', border: '#ef4444', label: 'badge-red' },
  critical:    { bg: '#fff7ed', border: '#f97316', label: 'badge-amber' },
  low_score:   { bg: '#fffbeb', border: '#f59e0b', label: 'badge-amber' },
  opportunity: { bg: '#f5f3ff', border: '#6431e2', label: 'badge-purple' },
  product:     { bg: '#f8fafc', border: '#94a3b8', label: 'badge-gray' },
};

function buildActions(reunioes) {
  const actions = [];
  const sorted = [...(reunioes || [])]
    .sort((a, b) => new Date(b.data_reuniao || b.created_at || 0) - new Date(a.data_reuniao || a.created_at || 0));

  for (const r of sorted) {
    const churn = (r.risco_churn   || '').toLowerCase();
    const saude = (r.saude_cliente || '').toLowerCase();
    const nome  = r.nome_cliente   || 'Cliente não identificado';
    const cs    = (r.analista_nome || '').split(' ')[0] || '—';
    const date  = r.data_reuniao || r.created_at;

    if (/\balto\b|\bcr[ií]tico\b/.test(churn)) {
      actions.push({ type: 'urgent',      icon: '🚨', title: `Follow-up urgente — ${nome}`,           body: `${cs} · ${r.risco_churn}`,          date });
    } else if (/\bcr[ií]tico\b|\bgreve\b|\bruim\b|\bnegativ/.test(saude)) {
      actions.push({ type: 'critical',    icon: '⚠️', title: `Saúde crítica detectada — ${nome}`,     body: `${cs} · ${r.saude_cliente}`,         date });
    } else if (r.media_final && r.media_final < 3 && r.media_final > 0) {
      actions.push({ type: 'low_score',   icon: '📉', title: `Score baixo (${r.media_final.toFixed(1)}/5) — ${nome}`, body: `${cs} · Revisar pontos de atenção`, date });
    } else if (
      (saude.includes('saudável') || saude.includes('saudavel') ||
       saude.includes('positiv')  || saude.includes('ótim') || saude.includes('otim')) &&
      /\bbaixo\b/.test(churn) && r.media_final >= 4
    ) {
      actions.push({ type: 'opportunity', icon: '✨', title: `Potencial de expansão — ${nome}`,       body: `${cs} · ${r.saude_cliente}`,         date });
    } else if (r.problema_produto) {
      actions.push({ type: 'product',     icon: '🔧', title: `Imprevisto de produto — ${nome}`,       body: `${cs} · Nota excluída da média`,     date });
    }
  }

  return actions
    .sort((a, b) => (PRIORITY[a.type] ?? 9) - (PRIORITY[b.type] ?? 9))
    .slice(0, 20);
}

export default function ActionFeed({ reunioes, stats }) {
  const actions = buildActions(reunioes);
  const churn   = stats?.churnStats || {};

  return (
    <div className="nibo-card rounded-xl flex flex-col" style={{ minHeight: 400 }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-nibo-ice flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(100,49,226,0.10)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
               style={{ color: '#6431e2' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-nibo-text">Feed de Ações</h3>
          <p className="text-[11px] text-nibo-muted">Prescrições da IA por prioridade</p>
        </div>
        {actions.length > 0 && (
          <span className="badge badge-purple flex-shrink-0">{actions.length}</span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 560 }}>
        {actions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-4xl">✅</p>
            <p className="text-nibo-text text-sm font-semibold">Tudo em ordem!</p>
            <p className="text-nibo-muted text-xs">Nenhuma ação necessária neste período.</p>
          </div>
        ) : (
          actions.map((a, i) => {
            const meta = TYPE_META[a.type] || TYPE_META.product;
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-3 rounded-xl transition-colors cursor-default"
                style={{
                  background:   meta.bg,
                  borderLeft:   `3px solid ${meta.border}`,
                }}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-nibo-text leading-snug">{a.title}</p>
                  <p className="text-[11px] text-nibo-muted mt-0.5 truncate">{a.body}</p>
                </div>
                <span className="text-[10px] text-nibo-muted flex-shrink-0 mt-0.5 whitespace-nowrap">
                  {relTime(a.date)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer — mini stats de churn */}
      <div className="px-5 py-3 border-t border-nibo-ice flex items-center justify-between flex-shrink-0 bg-nibo-bg/40">
        <div className="flex items-center gap-4">
          {[
            { label: 'alto',  color: '#ef4444', val: churn.alto  || 0 },
            { label: 'médio', color: '#f59e0b', val: churn.medio || 0 },
            { label: 'baixo', color: '#10B981', val: churn.baixo || 0 },
          ].map(x => (
            <span key={x.label} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: x.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: x.color }} />
              {x.val} {x.label}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-nibo-muted">churn IA</span>
      </div>
    </div>
  );
}
