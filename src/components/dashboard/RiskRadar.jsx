// RiskRadar — abas Risco vs Oportunidade
import { useState } from 'react';

function scoreColor(v) {
  if (!v) return '#64748b';
  if (v >= 4.5) return '#10B981';
  if (v >= 4.0) return '#34d399';
  if (v >= 3.5) return '#f59e0b';
  return '#ef4444';
}

function fmtDate(r) {
  const d = r.data_reuniao ? new Date(r.data_reuniao) : r.created_at ? new Date(r.created_at) : null;
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
}

function MeetingRow({ r, type }) {
  const isRisk = type === 'risk';
  const dotColor  = isRisk ? 'bg-red-400' : 'bg-violet-400';
  const textColor = isRisk ? 'text-red-300' : 'text-violet-300';
  const hoverBg   = isRisk ? 'hover:bg-red-500/5' : 'hover:bg-violet-500/5';
  const excerpt   = isRisk ? r.risco_churn : r.saude_cliente;

  return (
    <div className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-colors ${hoverBg} cursor-default`}>
      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white truncate">
            {r.nome_cliente || 'Cliente não identificado'}
          </p>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{fmtDate(r)}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {(r.analista_nome || '—').split(' ')[0]}
          {r.coordenador ? ` · ${r.coordenador}` : ''}
        </p>
        {excerpt && (
          <p className={`text-[11px] mt-1 font-medium ${textColor} leading-snug line-clamp-2`}>
            {excerpt}
          </p>
        )}
      </div>
      {r.media_final > 0 && (
        <span className="text-xs font-black flex-shrink-0 mt-0.5" style={{ color: scoreColor(r.media_final) }}>
          {r.media_final.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="py-10 text-center space-y-2">
      <p className="text-3xl">{icon}</p>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

export default function RiskRadar({ reunioes }) {
  const [tab, setTab] = useState('risk');

  const riskList = (reunioes || [])
    .filter(r => /\balto\b|\bcr[ií]tico\b/.test((r.risco_churn || '').toLowerCase()))
    .sort((a, b) => new Date(b.data_reuniao || b.created_at || 0) - new Date(a.data_reuniao || a.created_at || 0))
    .slice(0, 10);

  const oppList = (reunioes || [])
    .filter(r => {
      const saude = (r.saude_cliente || '').toLowerCase();
      const churn = (r.risco_churn || '').toLowerCase();
      return (
        (saude.includes('saudável') || saude.includes('saudavel') ||
         saude.includes('positiv') || saude.includes('ótim') || saude.includes('otim')) &&
        /\bbaixo\b/.test(churn)
      );
    })
    .sort((a, b) => new Date(b.data_reuniao || b.created_at || 0) - new Date(a.data_reuniao || a.created_at || 0))
    .slice(0, 10);

  const active = 'border-b-2 bg-white/5';

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab('risk')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all
            ${tab === 'risk' ? `text-red-400 border-red-400 ${active}` : 'text-slate-400 hover:text-white'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tab === 'risk' ? 'bg-red-400' : 'bg-slate-600'}`} />
          Radar de Risco
          {riskList.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {riskList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('opp')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all
            ${tab === 'opp' ? `text-violet-400 border-violet-400 ${active}` : 'text-slate-400 hover:text-white'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tab === 'opp' ? 'bg-violet-400' : 'bg-slate-600'}`} />
          Oportunidades
          {oppList.length > 0 && (
            <span className="bg-violet-500/20 text-violet-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {oppList.length}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
        {tab === 'risk' && (
          riskList.length === 0
            ? <Empty icon="✅" text="Nenhum risco de churn identificado neste período." />
            : riskList.map((r, i) => <MeetingRow key={i} r={r} type="risk" />)
        )}
        {tab === 'opp' && (
          oppList.length === 0
            ? <Empty icon="🔎" text="Nenhuma oportunidade mapeada neste período." />
            : oppList.map((r, i) => <MeetingRow key={i} r={r} type="opp" />)
        )}
      </div>
    </div>
  );
}
