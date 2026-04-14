// RiskRadar V2 — Light theme, abas Risco vs Oportunidade
import { useState } from 'react';

function scoreColor(v) {
  if (!v) return '#64748b';
  if (v >= 4.5) return '#10B981';
  if (v >= 4.0) return '#34d399';
  if (v >= 3.5) return '#f59e0b';
  return '#ef4444';
}

function scoreBadgeClass(v) {
  if (!v || v === 0) return 'badge badge-gray';
  if (v >= 4)   return 'badge badge-emerald';
  if (v >= 3)   return 'badge badge-amber';
  return 'badge badge-red';
}

function fmtDate(r) {
  const d = r.data_reuniao ? new Date(r.data_reuniao) : r.created_at ? new Date(r.created_at) : null;
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
}

function MeetingRow({ r, type }) {
  const isRisk    = type === 'risk';
  const dotColor  = isRisk ? '#ef4444' : '#6431e2';
  const textColor = isRisk ? 'text-red-600' : 'text-nibo-purple';
  const excerpt   = isRisk ? r.risco_churn : r.saude_cliente;

  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-nibo-bg transition-colors cursor-default">
      <span
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-nibo-text truncate">
            {r.nome_cliente || 'Cliente não identificado'}
          </p>
          <span className="text-[10px] text-nibo-muted flex-shrink-0 font-medium">
            {fmtDate(r)}
          </span>
        </div>
        <p className="text-[11px] text-nibo-muted mt-0.5">
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
        <span className={`${scoreBadgeClass(r.media_final)} flex-shrink-0 mt-0.5`}>
          {r.media_final.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="py-12 text-center space-y-2">
      <p className="text-3xl">{icon}</p>
      <p className="text-nibo-muted text-sm">{text}</p>
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
      const churn = (r.risco_churn  || '').toLowerCase();
      return (
        (saude.includes('saudável') || saude.includes('saudavel') ||
         saude.includes('positiv')  || saude.includes('ótim') || saude.includes('otim')) &&
        /\bbaixo\b/.test(churn)
      );
    })
    .sort((a, b) => new Date(b.data_reuniao || b.created_at || 0) - new Date(a.data_reuniao || a.created_at || 0))
    .slice(0, 10);

  return (
    <div className="nibo-card rounded-xl overflow-hidden">
      {/* Abas internas */}
      <div className="flex border-b border-nibo-ice">
        <button
          onClick={() => setTab('risk')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
            tab === 'risk'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-nibo-muted hover:text-nibo-text'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tab === 'risk' ? 'bg-red-500' : 'bg-nibo-ice'}`} />
          Radar de Risco
          {riskList.length > 0 && (
            <span className="badge badge-red">{riskList.length}</span>
          )}
        </button>

        <button
          onClick={() => setTab('opp')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
            tab === 'opp'
              ? 'border-nibo-purple text-nibo-purple'
              : 'border-transparent text-nibo-muted hover:text-nibo-text'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tab === 'opp' ? 'bg-nibo-purple' : 'bg-nibo-ice'}`} />
          Oportunidades
          {oppList.length > 0 && (
            <span className="badge badge-purple">{oppList.length}</span>
          )}
        </button>
      </div>

      {/* Lista */}
      <div className="p-3 space-y-0.5 max-h-80 overflow-y-auto">
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
