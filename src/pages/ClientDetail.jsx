import React from 'react';
import { Sparkles, ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// MOCK DATA - Dados da Reunião
const radarData = [
  { subject: 'Consultividade', A: 5, fullMark: 5 },
  { subject: 'Escuta Ativa',   A: 1, fullMark: 5 },
  { subject: 'Jornada',        A: 3, fullMark: 5 },
  { subject: 'Encantamento',   A: 2, fullMark: 5 },
  { subject: 'Objeções',       A: 5, fullMark: 5 },
  { subject: 'Rapport',        A: 1, fullMark: 5 },
  { subject: 'Autoridade',     A: 3, fullMark: 5 },
  { subject: 'Clareza',        A: 4, fullMark: 5 },
];

const pillarsMock = [
  {
    name: 'Consultividade',
    score: 5,
    description: 'Demonstrou domínio claro neste pilar, com exemplos práticos durante a reunião.',
    tip: 'Continuar o bom trabalho e compartilhar boas práticas com o time.',
  },
  {
    name: 'Escuta Ativa',
    score: 1,
    description: 'Necessita de desenvolvimento significativo neste aspecto. O cliente foi interrompido múltiplas vezes enquanto explicava o problema no módulo fiscal.',
    tip: 'Investir em treinamentos específicos e praticar o uso de pausas intencionais antes de responder.',
  },
  {
    name: 'Jornada do Cliente',
    score: 3,
    description: 'Apresentou nível adequado de conhecimento, mas há oportunidades de mapear melhor os próximos passos do cliente na nossa plataforma.',
    tip: 'Revisitar a documentação do cliente no CRM antes das reuniões para direcionar melhor a expansão.',
  },
  {
    name: 'Rapport',
    score: 1,
    description: 'A reunião começou de forma muito dura e direta ao ponto técnico, sem criar nenhuma conexão empática inicial.',
    tip: 'Tentar dedicar os primeiros 3 a 5 minutos para quebra-gelo e conexão interpessoal.',
  },
];

export default function ClientDetail() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contabilidade Express</h1>
            <p className="text-sm text-slate-500 mt-1">26/05/2025 • João Santos</p>
          </div>
        </div>

        {/* Top Grid: Exec Summary + Talk Ratio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Executive Summary */}
          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Resumo Executivo</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Reunião de acompanhamento com Contabilidade Express. O cliente demonstrou preocupações com o uso da
                plataforma em rotinas fiscais. Foram discutidos pontos de melhoria no fluxo de notas e definidos
                próximos passos de treinamento.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5" />
                Saúde: Atenção
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold tracking-wide">
                Risco Churn: Médio
              </span>
              <span className="md:ml-auto inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold tracking-wide">
                Nibo Contábil
              </span>
            </div>
          </div>

          {/* Talk Ratio */}
          <div className="col-span-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Tempo de Fala</h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">CS</span>
                  <span className="font-bold text-indigo-600">65%</span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-600">Cliente</span>
                  <span className="font-bold text-emerald-600">35%</span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2 leading-relaxed">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              O CS falou quase o dobro. O ideal é equalizar focando em perguntas abertas.
            </div>
          </div>
        </div>

        {/* Middle Grid: Radar + Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Radar Chart */}
          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-900">17 Pilares — Gráfico Radar</h2>
              <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-lg text-sm font-semibold border border-slate-100">
                Média: 2.9
              </span>
            </div>

            <div className="flex-1 min-h-[350px] w-full flex items-center justify-center mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Radar
                    name="Nota"
                    dataKey="A"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="#8B5CF6"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Checklist */}
          <div className="col-span-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Checklist da Reunião</h2>
            <ul className="space-y-5 flex-1">
              {[
                'Apresentou-se',
                'Contextualizou a reunião',
                'Identificou necessidades',
                'Apresentou solução',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
              {[
                'Definiu próximos passos',
                'Agendou follow-up',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-rose-700 font-semibold bg-rose-50/50 p-2 -ml-2 rounded-lg">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section: Pillars Detail */}
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-900">Detalhamento dos Pilares</h2>
            <div className="text-sm font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Insights da Inteligência Artificial
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {pillarsMock.map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-lg">{pillar.name}</h3>
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-base font-bold shadow-sm ${
                    pillar.score >= 4
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : pillar.score >= 3
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {pillar.score}
                  </span>
                </div>

                <p className="text-slate-600 text-base mb-6 leading-relaxed">{pillar.description}</p>

                <div className="flex items-start gap-3 text-sm text-indigo-800 bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                  <span className="font-semibold leading-relaxed">{pillar.tip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
