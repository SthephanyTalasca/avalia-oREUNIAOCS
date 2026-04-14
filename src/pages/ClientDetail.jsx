/**
 * ClientDetail.jsx — Ficha do Cliente (Avaliação Completa por IA)
 * Deps: lucide-react, recharts, tailwindcss
 * Renomeie para ClientDetail.tsx e adicione tipos se usar TypeScript
 */
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip,
} from 'recharts';
import { ArrowLeft, Calendar, User, Award, Mic } from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────────────
const MEETING = {
  id: '4',
  date: '07/04/2026',
  time: '14h30',
  client: 'JB Escritório Fiscal',
  analyst: 'Sthephany T.',
  coordinator: 'Taynara B.',
  score: 3.4,
  health: 'Atenção',
  churnRisk: 'Médio',
  talkRatio: { cs: 62, client: 38 },
  summary:
    'A reunião de onboarding foi conduzida com foco na configuração do módulo fiscal. ' +
    'A analista demonstrou boa relação com o cliente e clareza na apresentação das funcionalidades principais. ' +
    'Contudo, apresentou dificuldades ao abordar dúvidas sobre integração com sistema legado e não estabeleceu ' +
    'próximos passos claros ao encerrar a reunião. O cliente demonstrou sinais de incerteza sobre o prazo de ' +
    'migração, porém mostrou-se receptivo à solução. Ponto crítico: reunião ultrapassou o tempo previsto em 18 minutos.',
  pillars: [
    { id: 1,  name: 'Consultividade',    short: 'Consult.',    score: 3,
      just: 'A analista apresentou as funcionalidades de forma técnica, sem realizar perguntas estratégicas que revelassem as reais dores do cliente. Faltou postura consultiva para identificar oportunidades de melhoria no processo do escritório antes de propor soluções.',
      rec:  'Antes de demonstrar o produto, faça pelo menos 3 perguntas abertas usando a metodologia SPIN. Descubra as dores ocultas antes de mostrar qualquer funcionalidade.' },
    { id: 2,  name: 'Escuta Ativa',      short: 'Escuta',      score: 4,
      just: 'Demonstrou boa atenção às falas do cliente, confirmando informações e parafraseando pontos importantes. Houve duas interrupções que poderiam ter sido evitadas com um pouco mais de paciência.',
      rec:  'Aguarde 2 segundos após o cliente terminar de falar antes de responder — isso evita interrupções e demonstra respeito genuíno durante toda a conversa.' },
    { id: 3,  name: 'Jornada do Cliente', short: 'Jornada',    score: 4,
      just: 'Conhecia bem a etapa de onboarding e adequou a apresentação ao momento. Poderia ter contextualizado melhor o roadmap das próximas etapas do projeto para reduzir a ansiedade do cliente.',
      rec:  'Ao finalizar cada reunião, apresente visualmente a jornada completa ao cliente, mostrando onde ele está hoje e quais são os próximos marcos do projeto.' },
    { id: 4,  name: 'Encantamento',      short: 'Encant.',     score: 3,
      just: 'A reunião foi funcional, mas sem momentos marcantes que criassem uma experiência memorável. Faltou personalização e entusiasmo genuíno para elevar o nível de engajamento.',
      rec:  'Inicie com um "quick win" mostrando algo que já funciona no sistema, gerando confiança imediata. Personalize a abertura com 1 dado específico sobre o escritório do cliente.' },
    { id: 5,  name: 'Objeções',          short: 'Objeções',    score: 2,
      just: 'Quando o cliente levantou preocupações sobre a integração com sistema legado, a analista não apresentou alternativas concretas. A resposta genérica não gerou confiança — o cliente ficou com a percepção de que o problema seria ignorado.',
      rec:  'Mapeie as 5 objeções mais frequentes do onboarding e prepare respostas estruturadas. Para objeções técnicas, tenha sempre exemplos de clientes com perfil similar que superaram o mesmo desafio.' },
    { id: 6,  name: 'Rapport',           short: 'Rapport',     score: 5,
      just: 'Excelente conexão estabelecida desde os primeiros minutos. Utilizou linguagem adequada ao perfil do interlocutor, criou ambiente descontraído e demonstrou empatia genuína com as dificuldades apresentadas.',
      rec:  'Excelência atingida. Você é referência de rapport para o time — compartilhe suas técnicas nas próximas sessões de feedback coletivo.' },
    { id: 7,  name: 'Autoridade',        short: 'Autorid.',    score: 4,
      just: 'Demonstrou conhecimento sólido sobre produto e setor contábil. Em alguns momentos poderia ter sido mais assertiva nas recomendações, ao invés de apresentar múltiplas opções sem indicar a melhor.',
      rec:  'Ao apresentar soluções, sempre indique qual é sua recomendação e o motivo. Seja assertiva: "Para o perfil do seu escritório, a melhor configuração seria X porque..."' },
    { id: 8,  name: 'Postura',           short: 'Postura',     score: 5,
      just: 'Manteve postura profissional, segura e positiva durante toda a reunião. Energia e tom de voz adequados ao contexto, transmitindo credibilidade e confiança ao cliente em todos os momentos.',
      rec:  'Excelência atingida. Sua postura é um diferencial que impacta diretamente na percepção de valor que o cliente atribui ao serviço.' },
    { id: 9,  name: 'Gestão de Tempo',   short: 'Gest. T.',    score: 3,
      just: 'A reunião ultrapassou em 18 minutos o tempo previsto. Tópicos técnicos foram explorados em profundidade desnecessária para este momento do onboarding, consumindo o tempo reservado para definir próximos passos.',
      rec:  'Reserve os últimos 5 minutos para fechamento e próximos passos. Para tópicos técnicos complexos, use: "Vamos marcar uma reunião específica com nosso time técnico para aprofundar isso."' },
    { id: 10, name: 'Contextualização',  short: 'Context.',    score: 4,
      just: 'Boa compreensão do segmento contábil e das rotinas do escritório. Poderia ter explorado mais os dados do cliente (porte, volume de clientes, softwares em uso) antes da reunião para uma apresentação ainda mais personalizada.',
      rec:  'Faça um briefing de 5 minutos consultando o CRM antes de cada reunião. Tenha 3 fatos específicos sobre o cliente prontos para personalizar sua apresentação.' },
    { id: 11, name: 'Clareza',           short: 'Clareza',     score: 4,
      just: 'Explicações objetivas e acessíveis ao nível do interlocutor na maior parte do tempo. Algumas terminologias técnicas foram usadas sem simplificação, gerando confusão momentânea.',
      rec:  'Sempre que usar um termo técnico, complete imediatamente com uma analogia prática do cotidiano do escritório. Ex: "conciliação bancária automática é como ter um assistente que confere o extrato todo dia."' },
    { id: 12, name: 'Objetividade',      short: 'Objetiv.',    score: 3,
      just: 'Tendência a explorar detalhes além do necessário para o momento, tornando alguns trechos densos. O cliente demonstrou sinais de distração em duas oportunidades durante a apresentação.',
      rec:  'Adote o princípio "less is more": apresente o essencial e ofereça profundidade apenas se o cliente pedir. Use a estrutura: contexto (30s) → solução (1min) → próximo passo (30s).' },
    { id: 13, name: 'Flexibilidade',     short: 'Flexibil.',   score: 4,
      just: 'Soube adaptar o ritmo e a profundidade das explicações conforme as reações do cliente. Quando percebeu confusão, mudou a abordagem de forma eficaz e retomou o engajamento rapidamente.',
      rec:  'Continue desenvolvendo a leitura do cliente. Experimente perguntas de verificação a cada 10 minutos: "Isso faz sentido para a realidade do seu escritório?"' },
    { id: 14, name: 'Domínio do Produto', short: 'Dom. Prod.',  score: 3,
      just: 'Demonstrou conhecimento funcional do produto, mas teve dificuldades ao abordar a integração com sistemas de terceiros — justamente onde o cliente tinha dúvidas específicas. A falta de resposta clara impactou a confiança.',
      rec:  'Dedique 30 minutos semanais para estudar as integrações mais solicitadas. Crie um guia pessoal com os principais casos de uso por segmento para consultar durante as reuniões.' },
    { id: 15, name: 'Domínio de Negócio', short: 'Dom. Neg.',   score: 4,
      just: 'Boa compreensão do funcionamento de escritórios contábeis e dos desafios do setor. Conseguiu conectar os problemas do cliente às soluções do produto de forma contextualizada e relevante.',
      rec:  'Aprofunde o conhecimento sobre legislação fiscal do estado do cliente. Leia publicações do FENACON mensalmente para antecipar necessidades e demonstrar expertise diferenciada.' },
    { id: 16, name: 'Ecossistema Nibo',   short: 'Ecossis.',    score: 3,
      just: 'Apresentou o produto principal de forma adequada, mas não mencionou módulos complementares do ecossistema que seriam relevantes para este perfil de escritório, como emissão de notas e conciliação automática.',
      rec:  'Ao final de cada reunião, mencione pelo menos 1 módulo complementar relevante para o perfil do cliente. Prepare um "mapa do ecossistema" personalizado por tipo de escritório.' },
    { id: 17, name: 'Universo Contábil',  short: 'Univ. Cont.', score: 4,
      just: 'Demonstrou boa compreensão das rotinas contábeis, do calendário fiscal e das obrigações mensais dos escritórios. Utilizou esse conhecimento para contextualizar a urgência de alguns processos de forma eficaz.',
      rec:  'Mantenha-se atualizada sobre mudanças na legislação e novas obrigações fiscais. Participar de webinars do CFC pode ser um diferencial na hora de orientar clientes sobre cenários futuros.' },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function HealthPill({ status }) {
  const map = {
    Saudável: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Atenção:  'bg-amber-50   text-amber-700   border-amber-100',
    Crítico:  'bg-rose-50    text-rose-700    border-rose-100',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${map[status] ?? map.Atenção}`}>
      {status}
    </span>
  );
}

function ChurnPill({ risk }) {
  const map = {
    Baixo: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Médio: 'bg-amber-50   text-amber-700   border-amber-100',
    Alto:  'bg-rose-50    text-rose-700    border-rose-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${map[risk] ?? map.Médio}`}>
      Churn {risk}
    </span>
  );
}

function scoreBadgeClass(score) {
  if (score === 5) return 'bg-emerald-100 text-emerald-700';
  if (score === 4) return 'bg-emerald-50  text-emerald-600';
  if (score === 3) return 'bg-amber-50    text-amber-700';
  if (score === 2) return 'bg-rose-50     text-rose-600';
  return                  'bg-rose-100    text-rose-700';
}

function TalkBar({ label, pct, color, textColor }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function PillarCard({ pillar }) {
  const isExcellent = pillar.score === 5;
  const recBg       = isExcellent
    ? 'bg-emerald-50 border-emerald-100'
    : 'bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-100';
  const recLabel    = isExcellent ? '⭐ Reconhecimento da IA' : '✨ Ação Recomendada pela IA';
  const recTextCls  = isExcellent ? 'text-emerald-800' : 'text-violet-800';
  const recLblCls   = isExcellent ? 'text-emerald-600' : 'text-violet-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* Row: name + badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-slate-900 font-semibold leading-tight">{pillar.name}</h4>
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-black ${scoreBadgeClass(pillar.score)}`}>
          {pillar.score}/5
        </span>
      </div>

      {/* Justification */}
      <p className="text-slate-500 text-sm leading-relaxed mb-4">{pillar.just}</p>

      {/* AI recommendation */}
      <div className={`rounded-xl border p-4 ${recBg}`}>
        <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${recLblCls}`}>
          {recLabel}
        </p>
        <p className={`text-sm leading-relaxed ${recTextCls}`}>{pillar.rec}</p>
      </div>
    </div>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{payload[0]?.payload?.subject}</p>
      <p className="text-violet-600 font-bold">{payload[0]?.value}/5</p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function ClientDetail({ onBack }) {
  const { pillars, talkRatio, summary, health, churnRisk, client, analyst, coordinator, date, time, score } = MEETING;

  const radarData = pillars.map(p => ({
    subject:  p.short,
    value:    p.score,
    fullMark: 5,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mt-1 p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-slate-700 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{client}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {date} às {time}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {analyst}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Coord. {coordinator}
              </span>
            </div>
          </div>
          {/* Global score */}
          <div className="flex-shrink-0 text-right">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nota Geral</p>
            <p className="text-4xl font-black text-slate-900 tabular-nums">{score.toFixed(1)}</p>
            <p className="text-[11px] text-slate-400">de 5,0</p>
          </div>
        </div>

        {/* ── Row 1: Summary + Talk Ratio ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* Executive Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Resumo Executivo
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-semibold border border-violet-100">
                IA
              </span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-5">{summary}</p>
            <div className="flex flex-wrap gap-2">
              <HealthPill status={health} />
              <ChurnPill  risk={churnRisk} />
            </div>
          </div>

          {/* Talk Ratio */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mic className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Talk Ratio
              </span>
            </div>
            <div className="space-y-5">
              <TalkBar
                label="CS / Analista"
                pct={talkRatio.cs}
                color="#8b5cf6"
                textColor="text-violet-600"
              />
              <TalkBar
                label="Cliente"
                pct={talkRatio.client}
                color="#38bdf8"
                textColor="text-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-5 border-t border-slate-50 pt-4">
              Ideal: 40–60% cada · Equilíbrio favorece a escuta ativa
            </p>
          </div>
        </div>

        {/* ── Section title ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black text-slate-900">Avaliação dos 17 Pilares</h2>
          <span className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full font-bold border border-violet-100">
            gerada por IA
          </span>
        </div>

        {/* ── Row 2: Radar + Pillars ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

          {/* Radar Chart — sticky */}
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Visão Geral dos Pilares
              </p>
              <div className="flex items-center justify-center">
                <RadarChart
                  width={340}
                  height={340}
                  data={radarData}
                  margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
                >
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 5]}
                    tick={false}
                    axisLine={false}
                    tickCount={6}
                  />
                  <Tooltip content={<RadarTooltip />} />
                  <Radar
                    name="Nota"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </RadarChart>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-slate-50">
                {[
                  { label: '5 — Excelência',   cls: 'bg-emerald-100 text-emerald-700' },
                  { label: '4 — Bom',           cls: 'bg-emerald-50  text-emerald-600' },
                  { label: '3 — Regular',       cls: 'bg-amber-50    text-amber-700'   },
                  { label: '1–2 — A melhorar',  cls: 'bg-rose-50     text-rose-600'    },
                ].map(x => (
                  <div key={x.label} className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${x.cls}`}>
                      {x.label[0]}
                    </span>
                    <span className="text-[11px] text-slate-500">{x.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pillar Cards */}
          <div className="space-y-4">
            {pillars.map(p => <PillarCard key={p.id} pillar={p} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
