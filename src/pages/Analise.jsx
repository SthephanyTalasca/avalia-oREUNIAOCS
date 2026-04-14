import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';

// ── Constantes ─────────────────────────────────────────────────────────────
const PILLARS = [
  ['consultividade',    'Consultividade'],
  ['escuta_ativa',      'Escuta Ativa'],
  ['jornada_cliente',   'Jornada do Cliente'],
  ['encantamento',      'Encantamento'],
  ['objecoes',          'Objeções/Bugs'],
  ['rapport',           'Rapport'],
  ['autoridade',        'Autoridade'],
  ['postura',           'Postura'],
  ['gestao_tempo',      'Gestão de Tempo'],
  ['contextualizacao',  'Contextualização'],
  ['clareza',           'Clareza'],
  ['objetividade',      'Objetividade'],
  ['flexibilidade',     'Flexibilidade'],
  ['dominio_produto',   'Domínio de Produto'],
  ['dominio_negocio',   'Domínio de Negócio'],
  ['ecossistema_nibo',  'Ecossistema Nibo'],
  ['universo_contabil', 'Universo Contábil'],
];

const LOADING_STEPS = [
  'Processando transcrição...',
  'Avaliando 17 pilares de CS...',
  'Identificando desalinhamentos de venda...',
  'Detectando bugs e erros relatados...',
  'Levantando sugestões de melhoria...',
  'Gerando relatório de auditoria...',
  'Finalizando análise...',
];

const TIPO_META = {
  funcionalidade: { label: 'Funcionalidade', bg: '#ede9fe', color: '#6d28d9' },
  usabilidade:    { label: 'Usabilidade',    bg: '#fff7ed', color: '#c2410c' },
  integracao:     { label: 'Integração',     bg: '#ecfdf5', color: '#065f46' },
  processo:       { label: 'Processo',       bg: '#fef3c7', color: '#92400e' },
  relatorio:      { label: 'Relatório',      bg: '#eff6ff', color: '#1e40af' },
  outro:          { label: 'Outro',          bg: '#f1f5f9', color: '#475569' },
};

const PROD_COLORS = {
  Nibo: '#6431e2', Radar: '#0072ce', Conciliador: '#059669',
  BPO: '#d97706', Outro: '#64748b',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(n) {
  if (n === null || n === undefined) return { text: '#94a3b8', border: '#e2e8f0', bg: '#f8fafc' };
  if (n >= 4) return { text: '#059669', border: '#a7f3d0', bg: '#ecfdf5' };
  if (n >= 3) return { text: '#0072ce', border: '#bfdbfe', bg: '#eff6ff' };
  return { text: '#ef4444', border: '#fecaca', bg: '#fef2f2' };
}

function mediaLabel(m) {
  if (!m) return { label: '—', color: '#94a3b8' };
  if (m >= 4.5) return { label: 'Excelente', color: '#059669' };
  if (m >= 3.5) return { label: 'Bom', color: '#0072ce' };
  if (m >= 2.5) return { label: 'Aceitável', color: '#f59e0b' };
  return { label: 'Precisa Melhorar', color: '#ef4444' };
}

function prodColor(produto) {
  const k = Object.keys(PROD_COLORS).find(p => (produto || '').includes(p));
  return PROD_COLORS[k] || '#64748b';
}

// ── Componentes internos ────────────────────────────────────────────────────
function Toast({ msg, color, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl flex items-center gap-2"
      style={{ background: color }}
    >
      {msg}
    </div>
  );
}

function PillarCard({ label, nota, porque, melhoria, onClick }) {
  const c = scoreColor(nota);
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-2xl border transition-all hover:shadow-md active:scale-95"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate pr-2">{label}</span>
        <span className="text-xl font-black flex-shrink-0" style={{ color: c.text }}>
          {nota !== null && nota !== undefined ? nota : '—'}
        </span>
      </div>
      {porque && (
        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{porque}</p>
      )}
    </button>
  );
}

function PillarModal({ pilar, onClose }) {
  if (!pilar) return null;
  const c = scoreColor(pilar.nota);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-black text-nibo-petroleo text-base">{pilar.label}</h3>
          <span className="text-3xl font-black ml-4" style={{ color: c.text }}>
            {pilar.nota !== null && pilar.nota !== undefined ? pilar.nota : '—'}
          </span>
        </div>
        {pilar.porque && (
          <p className="text-sm text-slate-600 mb-3">{pilar.porque}</p>
        )}
        {pilar.melhoria && pilar.melhoria !== 'Excelência atingida.' && (
          <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-purple-400 mb-1">Melhoria</p>
            <p className="text-sm text-slate-700">{pilar.melhoria}</p>
          </div>
        )}
        {pilar.melhoria === 'Excelência atingida.' && (
          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
            <p className="text-sm text-emerald-700 font-bold">✓ Excelência atingida.</p>
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function FeedbackBtn({ label, onClick }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    await onClick();
    setDone(true);
    setLoading(false);
  }
  return (
    <button
      onClick={handle}
      disabled={done || loading}
      className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all disabled:opacity-40"
    >
      {loading ? 'Salvando...' : done ? '✓ Salvo' : label}
    </button>
  );
}

// ── Modal de importação do Google Drive ─────────────────────────────────────
function DriveModal({ onClose, onImport }) {
  const [url, setUrl]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) { setError('Cole o link do documento.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveUrl: trimmed, fetchOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao acessar arquivo.');
      onImport(data.text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#e8f0fe' }}>
            <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.92 15.92 0 006.6 13.85z" fill="#0066da"/>
              <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L0 51.6h27.5a15.92 15.92 0 0116.15-26.6z" fill="#00ac47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c1.05-1.8 1.6-3.85 1.6-5.9H60.5L73.55 76.8z" fill="#ea4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.4-4.55 1.2L43.65 25z" fill="#00832d"/>
              <path d="M60.5 51.6H27.5L13.75 75.4c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.4 4.55-1.2L60.5 51.6z" fill="#2684fc"/>
              <path d="M73.4 26.4c-1.35-.8-2.9-1.2-4.55-1.2H52.85c1.65 0 3.2.4 4.55 1.2l13.75 23.8L87.3 16.95c-3.1-3.05-7.3-4.95-11.95-4.95-3.9 0-7.5 1.2-10.45 3.25L73.4 26.4z" fill="#ffba00"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-nibo-petroleo text-base">Importar do Google Drive</h3>
            <p className="text-[11px] text-slate-500">Cole o link de um Google Doc compartilhado</p>
          </div>
        </div>

        {/* Instrução */}
        <div className="rounded-xl p-3 text-xs text-slate-600 space-y-1"
             style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="font-semibold text-slate-700">Como compartilhar:</p>
          <p>No Google Docs → <strong>Compartilhar</strong> → "Qualquer pessoa com o link" → <strong>Copiar link</strong></p>
        </div>

        {/* Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Link do documento
          </label>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(''); }}
            placeholder="https://docs.google.com/document/d/..."
            className="w-full px-3 py-2.5 rounded-xl border text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
            style={{ borderColor: error ? '#fca5a5' : '#e2e8f0' }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleImport()}
          />
          {error && <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>}
        </div>

        {/* Botões */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg,#6431e2,#0072ce)' }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importando...
              </>
            ) : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function Analise() {
  const [transcript, setTranscript]     = useState('');
  const [coordinator, setCoordinator]   = useState('');
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [stepIdx, setStepIdx]           = useState(0);
  const [result, setResult]             = useState(null);
  const [savedId, setSavedId]           = useState(null);
  const [toast, setToast]               = useState(null);
  const [activePilar, setActivePilar]   = useState(null);
  const [driveModal, setDriveModal]     = useState(false);
  const resultRef                       = useRef(null);
  const fileRef                         = useRef(null);
  const stepTimer                       = useRef(null);

  const showToast = useCallback((msg, color = '#059669') => {
    setToast({ msg, color });
  }, []);

  // Carrega coordenadores
  useEffect(() => {
    fetch('/api/coordinators')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCoordinators(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Animar steps durante loading
  useEffect(() => {
    if (loading) {
      setStepIdx(0);
      stepTimer.current = setInterval(() => {
        setStepIdx(i => (i + 1) % LOADING_STEPS.length);
      }, 2800);
    } else {
      clearInterval(stepTimer.current);
    }
    return () => clearInterval(stepTimer.current);
  }, [loading]);

  // ── Analisar ──────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    setSavedId(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: transcript, coordinator: coordinator || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na análise');

      setResult(data);

      // Salva automaticamente
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analise: { ...data, analista_nome: data.analista_nome },
          coordenador: coordinator || null,
        }),
      });
      if (saveRes.ok) {
        const saved = await saveRes.json();
        setSavedId(saved.id);
        showToast(`✅ ${data.analista_nome || 'Análise'} salva com sucesso!`);
      } else {
        showToast('⚠️ Análise exibida mas não salva no banco.', '#f59e0b');
      }
    } catch (e) {
      showToast('❌ ' + e.message, '#ef4444');
    } finally {
      setLoading(false);
    }
  }

  // ── Feedback "Não é bug / Não é desalinhamento" ──────────────────────────
  async function handleFeedback(tipo_original, item) {
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_original, item }),
    });
    if (r.ok) showToast('✅ Feedback salvo — o sistema vai aprender com isso!');
    else showToast('❌ Erro ao salvar feedback', '#ef4444');
  }

  // ── Upload PDF ────────────────────────────────────────────────────────────
  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) { showToast('⚠️ PDF.js não carregado', '#f59e0b'); return; }
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      setTranscript(text.trim());
      showToast('✅ PDF carregado com sucesso!');
    } catch (err) {
      showToast('❌ Erro ao ler PDF: ' + err.message, '#ef4444');
    }
    e.target.value = '';
  }

  // ── Export PDF ───────────────────────────────────────────────────────────
  async function handleExportPdf() {
    if (!resultRef.current || !window.html2pdf) return;
    const nomeCliente = result?.nome_cliente || 'cliente';
    const analista    = result?.analista_nome || 'analista';
    const filename    = `Auditoria_CS_${nomeCliente}_${analista}.pdf`.replace(/[\s/\\:*?"<>|]+/g, '_');
    try {
      await window.html2pdf().set({
        margin: [8, 8, 8, 8],
        filename,
        image:      { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(resultRef.current).save();
      showToast('✅ PDF gerado!');
    } catch (err) {
      showToast('❌ Erro ao gerar PDF', '#ef4444');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8" style={{ background: '#eef2f8' }}>
      {toast && (
        <Toast msg={toast.msg} color={toast.color} onClose={() => setToast(null)} />
      )}
      {activePilar && (
        <PillarModal pilar={activePilar} onClose={() => setActivePilar(null)} />
      )}
      {driveModal && (
        <DriveModal
          onClose={() => setDriveModal(false)}
          onImport={text => {
            setTranscript(text);
            setDriveModal(false);
            showToast('✅ Documento importado do Drive!');
          }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-black text-nibo-petroleo">Nova Análise</h1>
          <p className="text-sm text-slate-500 mt-1">Cole a transcrição ou envie um PDF para iniciar a auditoria.</p>
        </div>

        {/* ── Formulário ── */}
        <div className="glass-card p-6 space-y-4">
          {/* Coordenador */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Coordenador (opcional)
              </label>
              <select
                value={coordinator}
                onChange={e => setCoordinator(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">— Selecionar —</option>
                {coordinators.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Botões de importação */}
            <div className="flex items-end gap-2 flex-wrap">
              {/* Upload PDF */}
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-purple-300 hover:text-purple-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                PDF
              </button>

              {/* Importar do Drive */}
              <button
                onClick={() => setDriveModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0a15.92 15.92 0 006.6 13.85z" fill="#0066da"/>
                  <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L0 51.6h27.5a15.92 15.92 0 0116.15-26.6z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c1.05-1.8 1.6-3.85 1.6-5.9H60.5L73.55 76.8z" fill="#ea4335"/>
                  <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.4-4.55 1.2L43.65 25z" fill="#00832d"/>
                  <path d="M60.5 51.6H27.5L13.75 75.4c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.4 4.55-1.2L60.5 51.6z" fill="#2684fc"/>
                  <path d="M73.4 26.4c-1.35-.8-2.9-1.2-4.55-1.2H52.85c1.65 0 3.2.4 4.55 1.2l13.75 23.8 16.2-28.65c-3.1-3.05-7.3-4.95-11.95-4.95-3.9 0-7.5 1.2-10.45 3.25L73.4 26.4z" fill="#ffba00"/>
                </svg>
                Drive
              </button>
            </div>
          </div>

          {/* Transcrição */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Transcrição da Reunião</label>
              <span className="text-[10px] text-slate-400">{transcript.length.toLocaleString('pt-BR')} caracteres</span>
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Cole aqui a transcrição completa da reunião de CS..."
              rows={10}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder-slate-300"
            />
          </div>

          {/* Botão analisar */}
          <button
            onClick={handleAnalyze}
            disabled={loading || !transcript.trim()}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: loading || !transcript.trim() ? '#94a3b8' : 'linear-gradient(135deg,#6431e2,#0072ce)' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Analisar Sucesso do Cliente
              </>
            )}
          </button>

          {/* Loading steps */}
          {loading && (
            <div className="text-center py-2">
              <p className="text-xs text-slate-400 font-medium animate-pulse">{LOADING_STEPS[stepIdx]}</p>
              <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
                    background: 'linear-gradient(90deg,#6431e2,#0072ce)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Resultados ── */}
        {result && (
          <div ref={resultRef} className="space-y-6">

            {/* Analyst + client header */}
            <div className="glass-card p-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black"
                  style={{ background: 'linear-gradient(135deg,#6431e2,#002d72)' }}
                >
                  {(result.analista_nome || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-nibo-petroleo text-base">{result.analista_nome || 'Não identificado'}</p>
                  <p className="text-xs text-slate-400">{result.coordinator || result.coordenador || '—'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {result.nome_cliente && result.nome_cliente !== 'Não identificado' && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#ede9fe', color: '#6431e2' }}>
                    {result.nome_cliente}
                  </span>
                )}
                {result.produto_reuniao && result.produto_reuniao !== 'Não identificado' && (
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                    style={{ background: prodColor(result.produto_reuniao) }}
                  >
                    {result.produto_reuniao}
                  </span>
                )}
                {result.risco_churn && (
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{
                      background: result.risco_churn.toLowerCase().includes('alto') ? '#fef2f2' : result.risco_churn.toLowerCase().includes('médio') || result.risco_churn.toLowerCase().includes('medio') ? '#fefce8' : '#ecfdf5',
                      color: result.risco_churn.toLowerCase().includes('alto') ? '#dc2626' : result.risco_churn.toLowerCase().includes('médio') || result.risco_churn.toLowerCase().includes('medio') ? '#ca8a04' : '#059669',
                    }}
                  >
                    Churn {result.risco_churn}
                  </span>
                )}
              </div>
            </div>

            {/* Nota geral */}
            <div
              className="glass-card p-8 text-center"
              style={{ background: 'linear-gradient(135deg,#6431e2,#002d72,#41b6e6)' }}
            >
              <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-2">Nota Geral</p>
              <p className="text-7xl font-black text-white">{result.media_final?.toFixed(1) ?? '—'}</p>
              <p className="text-white/80 text-sm font-bold mt-1">{mediaLabel(result.media_final).label}</p>
              {result.resumo_executivo && (
                <p className="text-white/70 text-sm mt-4 max-w-xl mx-auto leading-relaxed">{result.resumo_executivo}</p>
              )}
            </div>

            {/* Saúde + Churn */}
            {(result.saude_cliente || result.risco_churn) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saúde do Cliente</p>
                  <p className="font-black text-nibo-petroleo">{result.saude_cliente || '—'}</p>
                </div>
                <div className="glass-card p-5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Risco Churn</p>
                  <p className="font-black text-nibo-petroleo">{result.risco_churn || '—'}</p>
                </div>
              </div>
            )}

            {/* 17 Pilares */}
            <div className="glass-card p-6">
              <h3 className="font-black text-nibo-petroleo text-sm mb-4 uppercase tracking-widest">17 Pilares de CS</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {PILLARS.map(([key, label]) => (
                  <PillarCard
                    key={key}
                    label={label}
                    nota={result[`nota_${key}`] ?? null}
                    porque={result[`porque_${key}`]}
                    melhoria={result[`melhoria_${key}`]}
                    onClick={() => setActivePilar({
                      key, label,
                      nota: result[`nota_${key}`] ?? null,
                      porque: result[`porque_${key}`],
                      melhoria: result[`melhoria_${key}`],
                    })}
                  />
                ))}
              </div>
            </div>

            {/* Tempo de fala + Checklist */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Tempo de fala */}
              {(result.tempo_fala_cs || result.tempo_fala_cliente) && (
                <div className="glass-card p-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Tempo de Fala</h4>
                  {[
                    { label: 'Analista CS', value: result.tempo_fala_cs, color: '#6431e2' },
                    { label: 'Cliente', value: result.tempo_fala_cliente, color: '#0072ce' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>{label}</span><span>{value || '—'}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: value || '0%', background: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist */}
              {result.checklist_cs && (
                <div className="glass-card p-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Checklist Onboarding</h4>
                  {[
                    ['definiu_prazo_implementacao', 'Definiu prazo'],
                    ['alinhou_dever_de_casa', 'Dever de casa'],
                    ['validou_certificado_digital', 'Certificado digital'],
                    ['agendou_proximo_passo', 'Próximo passo'],
                    ['conectou_com_dor_vendas', 'Dor de vendas'],
                    ['explicou_canal_suporte', 'Canal de suporte'],
                  ].map(([key, label]) => {
                    const ok = result.checklist_cs[key];
                    return (
                      <div key={key} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-400'}`}>
                          {ok ? '✓' : '✕'}
                        </span>
                        <span className="text-xs text-slate-600">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pontos fortes + Atenção */}
            {((result.pontos_fortes?.length > 0) || (result.pontos_atencao?.length > 0)) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {result.pontos_fortes?.length > 0 && (
                  <div className="rounded-2xl p-5 border border-emerald-200 bg-emerald-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-3">Pontos Fortes</h4>
                    <ul className="space-y-1.5">
                      {result.pontos_fortes.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                          <span className="text-emerald-500 mt-0.5">✓</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.pontos_atencao?.length > 0 && (
                  <div className="rounded-2xl p-5 border border-amber-200 bg-amber-50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">Pontos de Atenção</h4>
                    <ul className="space-y-1.5">
                      {result.pontos_atencao.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="text-amber-500 mt-0.5">⚠</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Bugs */}
            {result.tem_bugs && result.bugs?.length > 0 && (
              <div className="glass-card p-6" style={{ borderLeft: '6px solid #f97316' }}>
                <h3 className="font-black text-orange-700 text-sm mb-1">🐛 Bugs e Erros Detectados</h3>
                <p className="text-[11px] text-slate-500 mb-5">Problemas técnicos ou falhas relatadas durante a reunião.</p>
                <div className="space-y-4">
                  {result.bugs.map((b, idx) => {
                    const impCls = b.impacto === 'alto' ? 'bg-red-100 text-red-800' : b.impacto === 'medio' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800';
                    return (
                      <div key={idx} className="p-4 rounded-2xl border border-orange-200 bg-orange-50">
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${impCls}`}>
                            Impacto {b.impacto === 'alto' ? 'Alto' : b.impacto === 'medio' ? 'Médio' : 'Baixo'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">{b.status?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 mb-1">{b.descricao}</p>
                        {b.contexto && <p className="text-xs text-slate-600 mb-1"><strong>Contexto:</strong> {b.contexto}</p>}
                        {b.frase_cliente && <p className="text-[10px] italic text-slate-500 border-t border-orange-200 mt-2 pt-2">"{b.frase_cliente}"</p>}
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <FeedbackBtn label="Não é bug" onClick={() => handleFeedback('bug', b)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desalinhamentos */}
            {result.tem_desalinhamento && result.desalinhamentos?.length > 0 && (
              <div className="glass-card p-6" style={{ borderLeft: '6px solid #ef4444' }}>
                <h3 className="font-black text-red-700 text-sm mb-1">⚠️ Desalinhamentos de Venda</h3>
                <p className="text-[11px] text-slate-500 mb-5">Momentos em que o cliente relatou diferença entre o que foi prometido e o que recebeu.</p>
                <div className="space-y-4">
                  {result.desalinhamentos.map((d, idx) => {
                    const sevCls = d.severidade === 'alta' ? 'bg-red-200 text-red-800' : d.severidade === 'media' ? 'bg-amber-200 text-amber-800' : 'bg-yellow-100 text-yellow-800';
                    return (
                      <div key={idx} className="p-4 rounded-2xl border border-red-200 bg-red-50">
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${sevCls}`}>
                            Severidade {d.severidade === 'alta' ? 'Alta' : d.severidade === 'media' ? 'Média' : 'Baixa'}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">{d.como_tratado?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 mb-1">Expectativa: <span className="font-normal">{d.expectativa}</span></p>
                        {d.realidade && <p className="text-xs font-bold text-slate-700 mb-1">Realidade: <span className="font-normal">{d.realidade}</span></p>}
                        <p className="text-[10px] italic text-slate-500 border-t border-red-200 mt-2 pt-2">"{d.frase_cliente}"</p>
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <FeedbackBtn label="Não é desalinhamento" onClick={() => handleFeedback('desalinhamento', d)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Melhorias de Produto */}
            {result.tem_melhorias && result.melhorias?.length > 0 && (
              <div className="glass-card p-6" style={{ borderLeft: '6px solid #8b5cf6' }}>
                <h3 className="font-black text-purple-700 text-sm mb-1">💡 Sugestões de Melhoria de Produto</h3>
                <p className="text-[11px] text-slate-500 mb-5">Pedidos e feedbacks sobre funcionalidades, usabilidade e integrações.</p>
                <div className="space-y-4">
                  {result.melhorias.map((m, idx) => {
                    const tipo  = TIPO_META[m.tipo] || TIPO_META.outro;
                    const pColor = prodColor(m.produto);
                    return (
                      <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <p className="font-black text-slate-800 text-sm flex-1 min-w-0">{m.descricao}</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: `${pColor}18`, color: pColor }}>{m.produto}</span>
                            <span className="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: tipo.bg, color: tipo.color }}>{tipo.label}</span>
                          </div>
                        </div>
                        {m.contexto && <p className="text-[11px] text-slate-500 mb-1"><strong className="text-slate-400 uppercase text-[9px] tracking-wide">Contexto: </strong>{m.contexto}</p>}
                        {m.frase_cliente && (
                          <div className="rounded-xl p-3 border border-purple-100 bg-purple-50/40 mt-2">
                            <p className="text-[11px] text-slate-600 italic">"{m.frase_cliente}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relatório detalhado (markdown) */}
            {result.justificativa_detalhada && (
              <div className="glass-card p-6">
                <h3 className="font-black text-nibo-petroleo text-sm mb-5 uppercase tracking-widest">📋 Relatório de Auditoria</h3>
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  style={{ fontSize: '0.85rem', lineHeight: '1.7' }}
                  dangerouslySetInnerHTML={{ __html: marked.parse(result.justificativa_detalhada) }}
                />
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-3 pb-8">
              {savedId && (
                <a
                  href="/"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition"
                  style={{ background: '#6431e2' }}
                >
                  Ver no Dashboard
                </a>
              )}
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-purple-300 hover:text-purple-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Exportar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
