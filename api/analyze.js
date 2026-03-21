import { GoogleGenAI } from '@google/genai';
import { getConfig } from './config.js';

export const maxDuration = 300;
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Base de conhecimento por produto ─────────────────────────────────────────
const KNOWLEDGE_MAP = [
  {
    key: 'BPO / Gestão Financeira',
    envVar: 'CONHECIMENTO_BPO',
    keywords: ['bpo', 'gestão financeira', 'gestao financeira', 'financeiro', 'fluxo de caixa',
               'contas a pagar', 'contas a receber', 'lançamento', 'conciliação manual',
               'recebimento', 'pagamento', 'relatório financeiro'],
  },
  {
    key: 'Conciliador / Open Finance',
    envVar: 'CONHECIMENTO_CONCILIADOR',
    keywords: ['conciliador', 'open finance', 'ofx', 'importar extrato', 'extrato bancário',
               'conciliação automática', 'conciliacao automatica', 'sincronizar banco'],
  },
  {
    key: 'Radar e-CAC',
    envVar: 'CONHECIMENTO_RADAR',
    keywords: ['radar', 'e-cac', 'ecac', 'certidão', 'situação fiscal', 'pendência fiscal',
               'obrigações fiscais', 'receita federal'],
  },
  {
    key: 'Nibo via WhatsApp',
    envVar: 'CONHECIMENTO_WHATSAPP',
    keywords: ['whatsapp', 'whats', 'zap', 'notificação por mensagem', 'mensagem automática'],
  },
  {
    key: 'Nibo Obrigações Plus',
    envVar: 'CONHECIMENTO_OBRIGACOES',
    keywords: ['obrigações', 'obrigacoes', 'obrigações plus', 'declaração', 'sped',
               'guias', 'competência fiscal', 'dctf', 'defis', 'das', 'obrigação acessória'],
  },
  {
    key: 'Emissor de Notas (NFS-e)',
    envVar: 'CONHECIMENTO_EMISSOR',
    keywords: ['emissor', 'nota fiscal', 'nfs-e', 'nfse', 'nota de serviço',
               'emitir nota', 'prefeitura', 'rps'],
  },
];

function buildKnowledgeContext(transcript) {
  const lower = transcript.toLowerCase();
  const found = [];
  for (const produto of KNOWLEDGE_MAP) {
    if (!produto.keywords.some(kw => lower.includes(kw))) continue;
    const conteudo = process.env[produto.envVar];
    if (!conteudo) { console.warn(`⚠️ Produto "${produto.key}" sem env var ${produto.envVar}`); continue; }
    found.push({ nome: produto.key, conteudo });
    console.log(`📚 Produto detectado: ${produto.key}`);
  }
  if (!found.length) return '';
  const blocos = found.map(f =>
    `=== BASE DE CONHECIMENTO: ${f.nome} ===\n${f.conteudo}\n=== FIM: ${f.nome} ===`
  ).join('\n\n');
  return `\n\n---\nCONTEXTO DOS PRODUTOS NIBO MENCIONADOS NA REUNIÃO:\n${blocos}\n---\n`;
}

// ── Helpers JSON ──────────────────────────────────────────────────────────────
function extractText(response) {
  if (typeof response?.text === 'function') { try { return response.text(); } catch {} }
  if (typeof response?.text === 'string') return response.text;
  if (typeof response?.response?.text === 'function') { try { return response.response.text(); } catch {} }
  if (Array.isArray(response?.candidates) && response.candidates[0]?.content?.parts?.[0]?.text)
    return response.candidates[0].content.parts[0].text;
  if (typeof response === 'string') return response;
  throw new Error('EXTRACT_TEXT_FAILED');
}

function cleanJsonResponse(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) s = m[1].trim();
  s = s.replace(/^`+|`+$/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) s = s.substring(a, b + 1);
  return s.trim();
}

function repairJson(raw) {
  if (!raw) return '{}';
  let s = raw.trimEnd().replace(/,\s*$/, '').replace(/"[^"]*$/, '').replace(/:\s*$/, '').replace(/,\s*$/, '');
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }
  return s;
}

function safeParse(text, label) {
  if (!text) throw new Error(`${label}: texto vazio`);
  const cleaned = cleanJsonResponse(text);
  if (!cleaned) throw new Error(`${label}: vazio após limpeza`);
  try { return JSON.parse(cleaned); } catch {
    try { return JSON.parse(repairJson(cleaned)); }
    catch { throw new Error(`JSON_PARSE_FAILED: ${label}`); }
  }
}

async function withRetry(fn, label, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

// ── Monta o JSON esperado no prompt a partir dos pilares dinâmicos ────────────
function buildNotasExemplo(ALL_PILLARS) {
  return ALL_PILLARS.map(([k]) => `  "nota_${k}": -1`).join(',\n');
}

// ── CHAMADA 1: Notas numéricas ─────────────────────────────────────────────
async function getNumbers(transcript, knowledgeContext, ALL_PILLARS, PILLARS_PROMPT, PROMPTS) {
  const notasExemplo = buildNotasExemplo(ALL_PILLARS);

  // Monta blocos de instrução a partir do Supabase (fallback inline se não existir)
  const instrucaoContexto   = PROMPTS['instrucao_contexto_cs']   || 'Você avalia reuniões de CS da Nibo.';
  const instrucaoAvaliacao  = PROMPTS['instrucao_avaliacao']      || 'Seja rigoroso e baseie cada nota em evidências concretas da transcrição.';
  const instrucaoMedia      = PROMPTS['instrucao_media_final']    || 'media_final = média das notas válidas (excluindo -1).';

  const prompt = `${instrucaoContexto}

${instrucaoAvaliacao}

DEFINIÇÃO DOS PILARES E ESCALA DE NOTAS:
${PILLARS_PROMPT}
${knowledgeContext}
TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON (sem texto adicional, sem markdown):
{
  "media_final": 3.5,
  "tempo_fala_cs_pct": 60,
  "tempo_fala_cliente_pct": 40,
${notasExemplo},
  "ck_prazo": true,
  "ck_dever_casa": false,
  "ck_certificado": true,
  "ck_proximo_passo": true,
  "ck_dor_vendas": false,
  "ck_suporte": true
}

Use -1 quando não houver evidência suficiente. Notas de 1 a 5 (inteiros).
${instrucaoMedia}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  });

  const parsed = safeParse(extractText(res), 'getNumbers');

  ALL_PILLARS.forEach(([k]) => {
    let n = parsed['nota_' + k];
    if (n === -1 || n === '-1') { parsed['nota_' + k] = null; return; }
    if (n !== null && n !== undefined) {
      n = Math.min(5, Math.max(1, Math.round(Number(n))));
      parsed['nota_' + k] = isNaN(n) ? null : n;
    }
  });

  parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct || 50) + '%';
  parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
  parsed.checklist_cs = {
    definiu_prazo_implementacao: Boolean(parsed.ck_prazo),
    alinhou_dever_de_casa:       Boolean(parsed.ck_dever_casa),
    validou_certificado_digital: Boolean(parsed.ck_certificado),
    agendou_proximo_passo:       Boolean(parsed.ck_proximo_passo),
    conectou_com_dor_vendas:     Boolean(parsed.ck_dor_vendas),
    explicou_canal_suporte:      Boolean(parsed.ck_suporte),
  };
  return parsed;
}

// ── CHAMADA 2: Meta-textos ─────────────────────────────────────────────────
async function getMeta(transcript, numbers, knowledgeContext, ALL_PILLARS) {
  const notasStr = ALL_PILLARS
    .filter(([k]) => numbers['nota_' + k] !== null)
    .map(([k, l]) => `${l}: ${numbers['nota_' + k]}/5`).join(', ');

  const prompt = `Analise esta transcrição de CS da Nibo. Notas: ${notasStr}.${knowledgeContext}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON:
{
  "resumo_executivo": "Uma frase resumindo o onboarding",
  "saude_cliente": "Uma frase sobre saúde do cliente",
  "risco_churn": "Uma frase sobre risco de churn",
  "sistemas_citados": ["nome do produto Nibo mencionado"],
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_atencao": ["ponto de atenção 1"]
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  });
  return safeParse(extractText(res), 'getMeta');
}

// ── CHAMADA 3 + 4: Justificativas (divide em dois grupos para não estourar tokens) ──
async function getTextsA(transcript, numbers, knowledgeContext, ALL_PILLARS) {
  const group = ALL_PILLARS.slice(0, 9);
  const notasStr = group.filter(([k]) => numbers['nota_' + k] !== null)
    .map(([k, l]) => `${l}: ${numbers['nota_' + k]}/5`).join(', ');

  const campos = group.map(([k]) =>
    `  "porque_${k}":"justificativa","melhoria_${k}":"sugestão"`
  ).join(',\n');

  const prompt = `Justifique as notas de CS: ${notasStr}.${knowledgeContext}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON:
{
${campos}
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 3000, responseMimeType: 'application/json' },
  });
  return safeParse(extractText(res), 'getTextsA');
}

async function getTextsB(transcript, numbers, knowledgeContext, ALL_PILLARS) {
  const group = ALL_PILLARS.slice(9);
  const notasStr = group.filter(([k]) => numbers['nota_' + k] !== null)
    .map(([k, l]) => `${l}: ${numbers['nota_' + k]}/5`).join(', ');

  const campos = group.map(([k]) =>
    `  "porque_${k}":"justificativa","melhoria_${k}":"sugestão"`
  ).join(',\n');

  const prompt = `Justifique as notas de CS: ${notasStr}.${knowledgeContext}

TRANSCRIÇÃO:
${transcript}

Retorne APENAS este JSON:
{
${campos}
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 3000, responseMimeType: 'application/json' },
  });
  return safeParse(extractText(res), 'getTextsB');
}

// ── CHAMADA 5: Relatório ───────────────────────────────────────────────────
async function getRelatorio(numbers, meta, texts, coordinator, ALL_PILLARS) {
  const linhas = ALL_PILLARS.map(([k, l]) => {
    const nota = numbers['nota_' + k];
    if (nota === null) return null;
    const pq = texts['porque_' + k] || '';
    const ml = texts['melhoria_' + k] || '';
    const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
    return `- **${l}**: ${nota}/5 — ${pq}${suf}`;
  }).filter(Boolean).join('\n');

  const coordinatorLine = coordinator ? `Coordenador: **${coordinator}**\n\n` : '';
  const prompt = `Gere um feedback de CS em Markdown.

${coordinatorLine}NOTAS:
${linhas}

Média: ${numbers.media_final}/5
Saúde: ${meta.saude_cliente}
Churn: ${meta.risco_churn}
Fortes: ${(meta.pontos_fortes || []).join('; ')}
Atenção: ${(meta.pontos_atencao || []).join('; ')}

Use esta estrutura:
## O que fez bem
## O que melhorar
## O que falar no 1:1
## Plano de ação`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });
  return extractText(res);
}

// ── HANDLER ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const { prompt, coordinator } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Transcrição obrigatória.' });

  try {
    console.log('📝 Iniciando análise...');
    console.log('📏 Tamanho da transcrição:', prompt.length, 'caracteres');

    // Carrega configuração dinâmica do Supabase
    const { ALL_PILLARS, PILLARS_PROMPT, PROMPTS } = await getConfig();
    console.log(`⚙️ ${ALL_PILLARS.length} pilares carregados do Supabase`);

    const knowledgeContext = buildKnowledgeContext(prompt);

    const numbers = await withRetry(() => getNumbers(prompt, knowledgeContext, ALL_PILLARS, PILLARS_PROMPT, PROMPTS), 'getNumbers', 3);
    console.log('✅ Notas obtidas. Média:', numbers.media_final);

    const [meta, textsA, textsB] = await Promise.all([
      withRetry(() => getMeta(prompt, numbers, knowledgeContext, ALL_PILLARS), 'getMeta', 2),
      withRetry(() => getTextsA(prompt, numbers, knowledgeContext, ALL_PILLARS), 'getTextsA', 2),
      withRetry(() => getTextsB(prompt, numbers, knowledgeContext, ALL_PILLARS), 'getTextsB', 2),
    ]);
    console.log('✅ Meta e justificativas obtidas');

    const texts = { ...textsA, ...textsB };

    // Fallbacks
    ALL_PILLARS.forEach(([k]) => {
      if (numbers['nota_' + k] === null) {
        texts['porque_' + k] = texts['porque_' + k] || 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = '';
      } else {
        texts['porque_' + k] = texts['porque_' + k] || 'Sem justificativa disponível.';
        texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelência atingida.';
      }
    });

    meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
    meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
    meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
    meta.sistemas_citados = meta.sistemas_citados || [];
    meta.pontos_fortes    = meta.pontos_fortes    || [];
    meta.pontos_atencao   = meta.pontos_atencao   || [];

    const justificativa_detalhada = await withRetry(
      () => getRelatorio(numbers, meta, texts, coordinator, ALL_PILLARS), 'getRelatorio', 2
    );
    console.log('✅ Análise completa!');

    return res.status(200).json({
      ...numbers, ...meta, ...texts,
      justificativa_detalhada,
      coordinator,
    });

  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
    return res.status(500).json({ error: error.message || 'Erro ao analisar transcrição' });
  }
}
