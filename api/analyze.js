import { GoogleGenAI } from '@google/genai';

export const maxDuration = 300;

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' }
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ALL_PILLARS = [
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

// ─── Extração robusta de texto de qualquer resposta do Gemini ───────────────
function extractText(response) {
  // Gemini 2.5 Flash retorna em response.text diretamente na maioria dos casos
  if (typeof response?.text === 'string') {
    return response.text;
  }
  
  // Ou pode estar em response.candidates
  if (Array.isArray(response?.candidates)) {
    const candidate = response.candidates[0];
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }
  }
  
  // Se for array de objetos (content array)
  if (Array.isArray(response)) {
    const textBlock = response.find(c => c?.type === 'text' || c?.text);
    if (textBlock) {
      if (typeof textBlock.text === 'string') return textBlock.text;
      if (typeof textBlock === 'string') return textBlock;
    }
  }
  
  // Se for objeto com content
  if (response?.content) {
    if (Array.isArray(response.content)) {
      const textBlock = response.content.find(c => c?.type === 'text' || c?.text);
      if (textBlock?.text) return textBlock.text;
    } else if (typeof response.content === 'string') {
      return response.content;
    }
  }
  
  // Se for string direto
  if (typeof response === 'string') return response;
  
  // Último recurso
  const str = JSON.stringify(response);
  console.warn('⚠️  Conversão para string:', str.substring(0, 500));
  return str;
}

// ─── Limpa markdown e extrai JSON puro ────────────────────────────────────
function cleanJsonResponse(text) {
  if (!text || typeof text !== 'string') return '';
  
  let s = text.trim();
  
  // Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  const codeBlockMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    s = codeBlockMatch[1].trim();
  }
  
  // Se ainda tiver backticks soltos, remove
  s = s.replace(/^`+|`+$/g, '');
  
  // Remove texto antes do primeiro { e depois do último }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.substring(firstBrace, lastBrace + 1);
  }
  
  return s.trim();
}

// ─── Repara JSON truncado ─────────────────────────────────────────────────
function repairJson(raw) {
  if (!raw || typeof raw !== 'string') return '{}';
  
  let s = raw.trimEnd();
  s = s.replace(/,\s*$/, '');
  s = s.replace(/"[^"]*$/, '');
  s = s.replace(/:\s*$/, '');
  s = s.replace(/,\s*$/, '');
  
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc)              { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true;  continue; }
    if (ch === '"')       { inStr = !inStr; continue; }
    if (inStr)            continue;
    if      (ch === '{')  braces++;
    else if (ch === '}')  braces--;
    else if (ch === '[')  brackets++;
    else if (ch === ']')  brackets--;
  }
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces  > 0)  { s += '}'; braces--;  }
  return s;
}

function safeParse(text, label) {
  if (!text) throw new Error(`${label}: texto vazio`);
  
  // Primeiro limpa o texto
  const cleaned = cleanJsonResponse(text);
  console.log(`🔍 ${label} - Texto limpo (primeiros 200 chars):`, cleaned.substring(0, 200));
  
  if (!cleaned) throw new Error(`${label}: texto vazio após limpeza`);
  
  try { 
    return JSON.parse(cleaned); 
  } catch (e1) {
    console.warn(`⚠️  ${label} JSON inválido, tentando reparar...`);
    console.warn(`Erro original: ${e1.message}`);
    try {
      const repaired = repairJson(cleaned);
      const result = JSON.parse(repaired);
      console.log(`✅ ${label} reparado com sucesso`);
      return result;
    } catch (e2) {
      console.error(`❌ ${label} falhou mesmo após repair`);
      console.error('Texto original:', text.substring(0, 500));
      console.error('Texto limpo:', cleaned.substring(0, 500));
      console.error('Erro:', e2.message);
      throw new Error(`JSON_PARSE_FAILED: ${label}`);
    }
  }
}

async function withRetry(fn, label, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(`⚠️  ${label} tentativa ${i + 1}/${attempts} falhou:`, e.message);
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAMADA 1: NOTAS NUMÉRICAS
// ═══════════════════════════════════════════════════════════════════════════════
async function getNumbers(transcript) {
  const systemPrompt = `Você é um auditor de CS expert do Nibo. Avalie a transcrição e retorne APENAS um objeto JSON válido, sem nenhum texto adicional, sem markdown, sem backticks.

O JSON deve ter exatamente esta estrutura:
{
  "media_final": X.X,
  "tempo_fala_cs_pct": 0-100,
  "tempo_fala_cliente_pct": 0-100,
  "nota_consultividade": 1-5 ou -1,
  "nota_escuta_ativa": 1-5 ou -1,
  "nota_jornada_cliente": 1-5 ou -1,
  "nota_encantamento": 1-5 ou -1,
  "nota_objecoes": 1-5 ou -1,
  "nota_rapport": 1-5 ou -1,
  "nota_autoridade": 1-5 ou -1,
  "nota_postura": 1-5 ou -1,
  "nota_gestao_tempo": 1-5 ou -1,
  "nota_contextualizacao": 1-5 ou -1,
  "nota_clareza": 1-5 ou -1,
  "nota_objetividade": 1-5 ou -1,
  "nota_flexibilidade": 1-5 ou -1,
  "nota_dominio_produto": 1-5 ou -1,
  "nota_dominio_negocio": 1-5 ou -1,
  "nota_ecossistema_nibo": 1-5 ou -1,
  "nota_universo_contabil": 1-5 ou -1,
  "ck_prazo": true ou false,
  "ck_dever_casa": true ou false,
  "ck_certificado": true ou false,
  "ck_proximo_passo": true ou false,
  "ck_dor_vendas": true ou false,
  "ck_suporte": true ou false
}

REGRAS:
- -1 = sem evidência na transcrição
- 1-5 = notas reais (inteiros)
- media_final = média dos valores 1-5 (ignorar -1)
- RESPONDA APENAS COM O JSON, NADA MAIS`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Analise esta transcrição de reunião de CS:\n\n${transcript}` }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
    systemInstruction: systemPrompt,
  });

  const text = extractText(res);
  console.log('📦 Resposta bruta getNumbers (primeiros 500 chars):', text.substring(0, 500));
  
  const parsed = safeParse(text, 'getNumbers');

  // Converte -1 para null
  ALL_PILLARS.forEach(p => {
    const val = parsed['nota_' + p[0]];
    if (val === -1 || val === '-1') parsed['nota_' + p[0]] = null;
  });

  // Validação
  ALL_PILLARS.forEach(p => {
    const k = p[0];
    let n = parsed['nota_' + k];
    if (n !== null && n !== undefined) {
      n = Number(n);
      if (isNaN(n)) n = null;
      else {
        if (n < 1) n = 1;
        if (n > 5) n = 5;
        n = Math.round(n);
      }
      parsed['nota_' + k] = n;
    }
  });

  parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
  parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';

  parsed.checklist_cs = {
    definiu_prazo_implementacao:  Boolean(parsed.ck_prazo),
    alinhou_dever_de_casa:        Boolean(parsed.ck_dever_casa),
    validou_certificado_digital:  Boolean(parsed.ck_certificado),
    agendou_proximo_passo:        Boolean(parsed.ck_proximo_passo),
    conectou_com_dor_vendas:      Boolean(parsed.ck_dor_vendas),
    explicou_canal_suporte:       Boolean(parsed.ck_suporte),
  };

  return parsed;
}

// ─── CHAMADA 2: Meta-textos ────────────────────────────────────────────────
async function getMeta(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Analise esta transcrição. Notas já obtidas: ${notasStr}.

Retorne APENAS um objeto JSON válido, sem markdown, sem backticks, sem texto adicional:
{
  "resumo_executivo": "1 frase sobre o onboarding",
  "saude_cliente": "1 frase sobre saúde do cliente",
  "risco_churn": "1 frase sobre risco de churn",
  "sistemas_citados": ["sistema1", "sistema2"],
  "pontos_fortes": ["ponto1", "ponto2"],
  "pontos_atencao": ["atenção1", "atenção2"]
}

TRANSCRIÇÃO:
${transcript}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
    systemInstruction: 'Retorne APENAS JSON válido. Sem markdown, sem backticks, sem explicações. Apenas o objeto JSON.',
  });

  const text = extractText(res);
  console.log('📦 Resposta bruta getMeta (primeiros 300 chars):', text.substring(0, 300));
  return safeParse(text, 'getMeta');
}

// ─── CHAMADA 3: Justificativas (pilares 1-9) ──────────────────────────────
async function getTextsA(transcript, numbers) {
  const group = ALL_PILLARS.slice(0, 9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Justifique as notas. Notas: ${notasStr}.

Retorne APENAS JSON válido com porque_ e melhoria_ para cada pilar:
{
  "porque_consultividade": "...",
  "melhoria_consultividade": "...",
  "porque_escuta_ativa": "...",
  "melhoria_escuta_ativa": "...",
  "porque_jornada_cliente": "...",
  "melhoria_jornada_cliente": "...",
  "porque_encantamento": "...",
  "melhoria_encantamento": "...",
  "porque_objecoes": "...",
  "melhoria_objecoes": "...",
  "porque_rapport": "...",
  "melhoria_rapport": "...",
  "porque_autoridade": "...",
  "melhoria_autoridade": "...",
  "porque_postura": "...",
  "melhoria_postura": "...",
  "porque_gestao_tempo": "...",
  "melhoria_gestao_tempo": "..."
}

Regras:
- Se -1 (sem evidência): porque="Sem evidência na transcrição." melhoria=""
- Se tem nota: porque=1-2 frases. melhoria=1 frase.

TRANSCRIÇÃO:
${transcript}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
    },
    systemInstruction: 'Retorne APENAS JSON válido. Sem markdown, sem backticks. Apenas o objeto JSON.',
  });

  const text = extractText(res);
  console.log('📦 Resposta bruta getTextsA (primeiros 300 chars):', text.substring(0, 300));
  return safeParse(text, 'getTextsA');
}

// ─── CHAMADA 4: Justificativas (pilares 10-17) ────────────────────────────
async function getTextsB(transcript, numbers) {
  const group = ALL_PILLARS.slice(9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Justifique as notas. Notas: ${notasStr}.

Retorne APENAS JSON válido:
{
  "porque_contextualizacao": "...",
  "melhoria_contextualizacao": "...",
  "porque_clareza": "...",
  "melhoria_clareza": "...",
  "porque_objetividade": "...",
  "melhoria_objetividade": "...",
  "porque_flexibilidade": "...",
  "melhoria_flexibilidade": "...",
  "porque_dominio_produto": "...",
  "melhoria_dominio_produto": "...",
  "porque_dominio_negocio": "...",
  "melhoria_dominio_negocio": "...",
  "porque_ecossistema_nibo": "...",
  "melhoria_ecossistema_nibo": "...",
  "porque_universo_contabil": "...",
  "melhoria_universo_contabil": "..."
}

Regras:
- Se -1: porque="Sem evidência na transcrição." melhoria=""
- Se tem nota: porque=1-2 frases. melhoria=1 frase

TRANSCRIÇÃO:
${transcript}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
    },
    systemInstruction: 'Retorne APENAS JSON válido. Sem markdown, sem backticks. Apenas o objeto JSON.',
  });

  const text = extractText(res);
  console.log('📦 Resposta bruta getTextsB (primeiros 300 chars):', text.substring(0, 300));
  return safeParse(text, 'getTextsB');
}

// ─── CHAMADA 5: Relatório ─────────────────────────────────────────────────
async function getRelatorio(numbers, meta, texts, coordinator) {
  const linhas = ALL_PILLARS.map(p => {
    const k    = p[0];
    const nota = numbers['nota_' + k];
    if (nota === null) return null;
    const pq   = texts['porque_'   + k] || '';
    const ml   = texts['melhoria_' + k] || '';
    const suf  = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
    return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
  }).filter(Boolean).join('\n');

  const coordinatorLine = coordinator ? `Coordenador: **${coordinator}**\n\n` : '';
  const prompt = `FEEDBACK DE CS

${coordinatorLine}NOTAS:
${linhas}

Média: ${numbers.media_final}/5
Saúde: ${meta.saude_cliente}
Churn: ${meta.risco_churn}

Fortes: ${(meta.pontos_fortes || []).join('; ')}
Atenção: ${(meta.pontos_atencao || []).join('; ')}

Estruture o feedback assim:

## O que fez bem

## O que melhorar

## O que falar no 1:1

## Plano de ação`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
    systemInstruction: 'Coordenador sênior de CS do Nibo. Markdown puro. "O que falar": frases prontas. "Plano": máx 3 prioridades.',
  });

  return extractText(res);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { prompt, coordinator } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: 'Transcrição obrigatória.' });
  }

  try {
    console.log('📝 Iniciando análise...');
    console.log('📏 Tamanho da transcrição:', prompt.length, 'caracteres');
    
    const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers', 3);
    console.log('✅ Notas obtidas:', numbers.media_final);

    const [meta, textsA, textsB] = await Promise.all([
      withRetry(() => getMeta(prompt, numbers), 'getMeta', 2),
      withRetry(() => getTextsA(prompt, numbers), 'getTextsA', 2),
      withRetry(() => getTextsB(prompt, numbers), 'getTextsB', 2),
    ]);
    console.log('✅ Meta e justificativas obtidas');

    const texts = { ...textsA, ...textsB };

    // Fallbacks
    ALL_PILLARS.forEach(p => {
      const k = p[0];
      if (numbers['nota_' + k] === null) {
        texts['porque_'   + k] = texts['porque_'   + k] || 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = '';
      } else {
        texts['porque_'   + k] = texts['porque_'   + k] || 'Sem justificativa disponível.';
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
      () => getRelatorio(numbers, meta, texts, coordinator),
      'getRelatorio',
      2
    );
    console.log('✅ Análise completa!');

    return res.status(200).json({
      ...numbers,
      ...meta,
      ...texts,
      justificativa_detalhada,
      coordinator
    });

  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Erro ao analisar transcrição'
    });
  }
}
