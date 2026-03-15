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

// ─── Extração robusta de texto - cobre todas as variações da API Gemini ─────
function extractText(response) {
  console.log('🔎 Tipo da resposta:', typeof response);
  console.log('🔎 Keys da resposta:', response ? Object.keys(response) : 'null');
  
  // 1. response.text como função (SDK mais recente)
  if (typeof response?.text === 'function') {
    try {
      const result = response.text();
      console.log('✅ Extraído via response.text()');
      return result;
    } catch (e) {
      console.warn('⚠️ response.text() falhou:', e.message);
    }
  }
  
  // 2. response.text como string
  if (typeof response?.text === 'string') {
    console.log('✅ Extraído via response.text (string)');
    return response.text;
  }
  
  // 3. response.response.text() - estrutura aninhada
  if (typeof response?.response?.text === 'function') {
    try {
      const result = response.response.text();
      console.log('✅ Extraído via response.response.text()');
      return result;
    } catch (e) {
      console.warn('⚠️ response.response.text() falhou:', e.message);
    }
  }
  
  // 4. response.candidates (formato antigo/alternativo)
  if (Array.isArray(response?.candidates) && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (candidate?.content?.parts?.[0]?.text) {
      console.log('✅ Extraído via response.candidates[0].content.parts[0].text');
      return candidate.content.parts[0].text;
    }
  }
  
  // 5. Se for array de content blocks
  if (Array.isArray(response)) {
    const textBlock = response.find(c => c?.type === 'text' || c?.text);
    if (textBlock?.text) {
      console.log('✅ Extraído via array de content blocks');
      return textBlock.text;
    }
  }
  
  // 6. response.content
  if (response?.content) {
    if (typeof response.content === 'string') {
      console.log('✅ Extraído via response.content (string)');
      return response.content;
    }
    if (Array.isArray(response.content)) {
      const textBlock = response.content.find(c => c?.text);
      if (textBlock?.text) {
        console.log('✅ Extraído via response.content array');
        return textBlock.text;
      }
    }
  }
  
  // 7. String direto
  if (typeof response === 'string') {
    console.log('✅ Resposta já é string');
    return response;
  }
  
  // 8. Último recurso - stringify
  console.error('❌ Não conseguiu extrair texto. Estrutura completa:');
  console.error(JSON.stringify(response, null, 2).substring(0, 2000));
  throw new Error('EXTRACT_TEXT_FAILED: Não foi possível extrair texto da resposta do Gemini');
}

// ─── Limpa markdown e extrai JSON puro ────────────────────────────────────
function cleanJsonResponse(text) {
  if (!text || typeof text !== 'string') return '';
  
  let s = text.trim();
  
  // Remove blocos de código markdown
  const codeBlockMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    s = codeBlockMatch[1].trim();
  }
  
  // Remove backticks soltos
  s = s.replace(/^`+|`+$/g, '');
  
  // Extrai apenas o JSON (do primeiro { ao último })
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
  console.log(`🔍 ${label} - Texto limpo (200 chars):`, cleaned.substring(0, 200));
  
  if (!cleaned) throw new Error(`${label}: texto vazio após limpeza`);
  
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    console.warn(`⚠️ ${label} JSON inválido, tentando reparar...`);
    try {
      const repaired = repairJson(cleaned);
      const result = JSON.parse(repaired);
      console.log(`✅ ${label} reparado com sucesso`);
      return result;
    } catch (e2) {
      console.error(`❌ ${label} falhou. Texto original (500 chars):`, text.substring(0, 500));
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
      console.error(`⚠️ ${label} tentativa ${i + 1}/${attempts} falhou:`, e.message);
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAMADA 1: NOTAS NUMÉRICAS
// ═══════════════════════════════════════════════════════════════════════════════
async function getNumbers(transcript) {
  const userPrompt = `Analise esta transcrição de reunião de CS e retorne as notas.

TRANSCRIÇÃO:
${transcript}

---

Retorne APENAS este JSON (sem texto adicional, sem markdown):
{
  "media_final": 3.5,
  "tempo_fala_cs_pct": 60,
  "tempo_fala_cliente_pct": 40,
  "nota_consultividade": 4,
  "nota_escuta_ativa": 3,
  "nota_jornada_cliente": 4,
  "nota_encantamento": 3,
  "nota_objecoes": -1,
  "nota_rapport": 4,
  "nota_autoridade": 3,
  "nota_postura": 4,
  "nota_gestao_tempo": 4,
  "nota_contextualizacao": 3,
  "nota_clareza": 4,
  "nota_objetividade": 4,
  "nota_flexibilidade": 3,
  "nota_dominio_produto": 4,
  "nota_dominio_negocio": 3,
  "nota_ecossistema_nibo": -1,
  "nota_universo_contabil": -1,
  "ck_prazo": true,
  "ck_dever_casa": false,
  "ck_certificado": true,
  "ck_proximo_passo": true,
  "ck_dor_vendas": false,
  "ck_suporte": true
}

Use -1 quando não houver evidência. Notas de 1 a 5 (inteiros). media_final = média das notas válidas.`;

  console.log('📤 Chamando Gemini para getNumbers...');
  
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  console.log('📥 Resposta recebida do Gemini');
  
  const text = extractText(res);
  console.log('📦 Texto extraído (500 chars):', text.substring(0, 500));
  
  const parsed = safeParse(text, 'getNumbers');

  // Converte -1 para null
  ALL_PILLARS.forEach(p => {
    const val = parsed['nota_' + p[0]];
    if (val === -1 || val === '-1') parsed['nota_' + p[0]] = null;
  });

  // Validação das notas
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

  parsed.tempo_fala_cs = (parsed.tempo_fala_cs_pct || 50) + '%';
  parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';

  parsed.checklist_cs = {
    definiu_prazo_implementacao: Boolean(parsed.ck_prazo),
    alinhou_dever_de_casa: Boolean(parsed.ck_dever_casa),
    validou_certificado_digital: Boolean(parsed.ck_certificado),
    agendou_proximo_passo: Boolean(parsed.ck_proximo_passo),
    conectou_com_dor_vendas: Boolean(parsed.ck_dor_vendas),
    explicou_canal_suporte: Boolean(parsed.ck_suporte),
  };

  return parsed;
}

// ─── CHAMADA 2: Meta-textos ────────────────────────────────────────────────
async function getMeta(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Analise esta transcrição de CS. Notas: ${notasStr}.

TRANSCRIÇÃO:
${transcript}

---

Retorne APENAS este JSON:
{
  "resumo_executivo": "Uma frase resumindo o onboarding",
  "saude_cliente": "Uma frase sobre saúde do cliente",
  "risco_churn": "Uma frase sobre risco de churn",
  "sistemas_citados": ["sistema1", "sistema2"],
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_atencao": ["ponto de atenção 1"]
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const text = extractText(res);
  return safeParse(text, 'getMeta');
}

// ─── CHAMADA 3: Justificativas (pilares 1-9) ──────────────────────────────
async function getTextsA(transcript, numbers) {
  const group = ALL_PILLARS.slice(0, 9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Justifique as notas de CS: ${notasStr}

TRANSCRIÇÃO:
${transcript}

---

Retorne APENAS este JSON com porque_ e melhoria_ para os 9 pilares:
{
  "porque_consultividade": "justificativa",
  "melhoria_consultividade": "sugestão",
  "porque_escuta_ativa": "justificativa",
  "melhoria_escuta_ativa": "sugestão",
  "porque_jornada_cliente": "justificativa",
  "melhoria_jornada_cliente": "sugestão",
  "porque_encantamento": "justificativa",
  "melhoria_encantamento": "sugestão",
  "porque_objecoes": "justificativa",
  "melhoria_objecoes": "sugestão",
  "porque_rapport": "justificativa",
  "melhoria_rapport": "sugestão",
  "porque_autoridade": "justificativa",
  "melhoria_autoridade": "sugestão",
  "porque_postura": "justificativa",
  "melhoria_postura": "sugestão",
  "porque_gestao_tempo": "justificativa",
  "melhoria_gestao_tempo": "sugestão"
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  });

  const text = extractText(res);
  return safeParse(text, 'getTextsA');
}

// ─── CHAMADA 4: Justificativas (pilares 10-17) ────────────────────────────
async function getTextsB(transcript, numbers) {
  const group = ALL_PILLARS.slice(9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const prompt = `Justifique as notas de CS: ${notasStr}

TRANSCRIÇÃO:
${transcript}

---

Retorne APENAS este JSON:
{
  "porque_contextualizacao": "justificativa",
  "melhoria_contextualizacao": "sugestão",
  "porque_clareza": "justificativa",
  "melhoria_clareza": "sugestão",
  "porque_objetividade": "justificativa",
  "melhoria_objetividade": "sugestão",
  "porque_flexibilidade": "justificativa",
  "melhoria_flexibilidade": "sugestão",
  "porque_dominio_produto": "justificativa",
  "melhoria_dominio_produto": "sugestão",
  "porque_dominio_negocio": "justificativa",
  "melhoria_dominio_negocio": "sugestão",
  "porque_ecossistema_nibo": "justificativa",
  "melhoria_ecossistema_nibo": "sugestão",
  "porque_universo_contabil": "justificativa",
  "melhoria_universo_contabil": "sugestão"
}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
    },
  });

  const text = extractText(res);
  return safeParse(text, 'getTextsB');
}

// ─── CHAMADA 5: Relatório ─────────────────────────────────────────────────
async function getRelatorio(numbers, meta, texts, coordinator) {
  const linhas = ALL_PILLARS.map(p => {
    const k = p[0];
    const nota = numbers['nota_' + k];
    if (nota === null) return null;
    const pq = texts['porque_' + k] || '';
    const ml = texts['melhoria_' + k] || '';
    const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
    return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
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
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
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
    console.log('✅ Notas obtidas. Média:', numbers.media_final);

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
        texts['porque_' + k] = texts['porque_' + k] || 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = '';
      } else {
        texts['porque_' + k] = texts['porque_' + k] || 'Sem justificativa disponível.';
        texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelência atingida.';
      }
    });

    meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
    meta.saude_cliente = meta.saude_cliente || 'Não avaliado.';
    meta.risco_churn = meta.risco_churn || 'Não avaliado.';
    meta.sistemas_citados = meta.sistemas_citados || [];
    meta.pontos_fortes = meta.pontos_fortes || [];
    meta.pontos_atencao = meta.pontos_atencao || [];

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
