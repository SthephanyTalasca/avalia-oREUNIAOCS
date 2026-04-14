// KpiCards V2 — Light theme com sparkline de tendência
function Sparkline({ data, color, w = 72, h = 28 }) {
  const vals = (data || []).map(d => d.media).filter(v => v > 0);
  if (vals.length < 2) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.1;
  const pts = vals
    .map((v, i) => {
      const x = ((i / (vals.length - 1)) * w).toFixed(1);
      const y = (h - 4 - ((v - min) / range) * (h - 8)).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
  const lv = vals[vals.length - 1];
  const lx = w;
  const ly = +(h - 4 - ((lv - min) / range) * (h - 8)).toFixed(1);
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.6" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

function scoreColor(v) {
  if (!v || v === 0) return '#64748b';
  if (v >= 4.5) return '#10B981';
  if (v >= 4.0) return '#34d399';
  if (v >= 3.5) return '#f59e0b';
  if (v >= 3.0) return '#f97316';
  return '#ef4444';
}

export default function KpiCards({ stats }) {
  const { total = 0, media_geral, churnStats = {}, saudeStats = {}, evolucao = [] } = stats;

  const churnRate = total > 0 ? Math.round(((churnStats.alto || 0) / total) * 100) : 0;
  const saudeRate = total > 0 ? Math.round(((saudeStats.saudavel || 0) / total) * 100) : 0;
  const mhsColor  = scoreColor(media_geral);

  const trend = evolucao.length >= 2
    ? +((evolucao[evolucao.length - 1]?.media ?? 0) - (evolucao[evolucao.length - 2]?.media ?? 0)).toFixed(1)
    : null;

  const churnColor = churnRate > 20 ? '#ef4444' : churnRate > 10 ? '#f97316' : '#10B981';
  const saudeColor = saudeRate > 60 ? '#10B981' : saudeRate > 40 ? '#f59e0b' : '#ef4444';

  const cards = [
    {
      label: 'Reuniões Analisadas',
      value: total,
      unit:  '',
      sub:   'total no período',
      color: '#6431e2',
      spark: null,
      icon:  <IconVideo />,
    },
    {
      label: 'Meeting Health Score',
      value: media_geral ? media_geral.toFixed(1) : '—',
      unit:  '/5',
      sub:   trend !== null
        ? (trend >= 0 ? `↑ +${trend} vs semana anterior` : `↓ ${trend} vs semana anterior`)
        : 'média geral das notas de IA',
      color: mhsColor,
      spark: evolucao,
      icon:  <IconStar />,
    },
    {
      label: 'Risco de Churn',
      value: `${churnRate}%`,
      unit:  '',
      sub:   `${churnStats.alto || 0} reuniões com alerta alto`,
      color: churnColor,
      spark: null,
      icon:  <IconAlert />,
    },
    {
      label: 'Clientes Saudáveis',
      value: `${saudeRate}%`,
      unit:  '',
      sub:   `${saudeStats.saudavel || 0} de ${total} reuniões`,
      color: saudeColor,
      spark: null,
      icon:  <IconHeart />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="nibo-card nibo-card-hover relative overflow-hidden rounded-xl p-5 cursor-default"
        >
          {/* Barra de acento colorida no topo */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
            style={{ background: `linear-gradient(90deg, ${c.color}, ${c.color}30)` }}
          />

          {/* Ícone + sparkline */}
          <div className="flex items-start justify-between mb-4 mt-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${c.color}18` }}
            >
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            {c.spark && <Sparkline data={c.spark} color={c.color} />}
          </div>

          {/* Label */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-nibo-muted mb-1">
            {c.label}
          </p>

          {/* Valor */}
          <p className="text-3xl font-black leading-none" style={{ color: c.color }}>
            {c.value}
            {c.unit && (
              <span className="text-sm font-semibold text-nibo-muted ml-1">{c.unit}</span>
            )}
          </p>

          {/* Sub */}
          {c.sub && (
            <p className="text-[11px] text-nibo-muted mt-1.5 leading-snug">{c.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function IconVideo() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
