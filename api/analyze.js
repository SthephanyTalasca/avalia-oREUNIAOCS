import { GoogleGenAI, Type } from '@google/genai';

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

// ─── Repara JSON truncado ─────────────────────────────────────────────────
function repairJson(raw) {
  let s = (raw || '').trimEnd();
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
  try { 
    return JSON.parse(text); 
  } catch (e1) {
    try {
      const repaired = repairJson(text);
      const result = JSON.parse(repaired);
      console.log(`✅ ${label} reparado com sucesso`);
      return result;
    } catch (e2) {
      console.error(`❌ ${label} falhou:`, (text || '').substring(0, 200));
      throw new Error(`JSON_PARSE_FAILED: ${label}`);
    }
  }
}

// ─── Extrair texto da resposta (funciona com diferentes formatos) ──────────
function extractText(response) {
  // Se tiver content array
  if (response?.content && Array.isArray(response.content)) {
    const textBlock = response.content.find(c => c.type === 'text');
    if (textBlock?.text) return textBlock.text;
  }
  
  // Se tiver text direto
  if (typeof response === 'string') return response;
  if (typeof response?.text === 'string') return response.text;
  
  // Se for o objeto inteiro
  return JSON.stringify(response);
}

function makeTextSchema(pairs) {
  const props = {};
  const req   = [];
  pairs.forEach(function(p) {
    const k = p[0];
    props['porque_'   + k] = { type: Type.STRING };
    props['melhoria_' + k] = { type: Type.STRING };
    req.push('porque_' + k, 'melhoria_' + k);
  });
  return { type: Type.OBJECT, properties: props, required: req };
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
  const systemPrompt = `Você é um auditor de CS expert do Nibo. Avalie APENAS o que está na transcrição.

REGRAS:
- Se não houver evidência = -1
- Notas: 1=Péssimo, 2=Fraco, 3=Adequado, 4=Bom, 5=Excelente
- DETERMINÍSTICO: mesma transcrição = mesmas notas
- Arredonde para inteiro (1-5)

CRITÉRIOS POR PILAR:
- Consultividade: Recomenda soluções? (5=sim, assertivas)
- Escuta Ativa: Pergunta? Cliente fala 40%+? (5=sim em ambos)
- Jornada do Cliente: Próximos passos claros? (5=roadmap + datas)
- Encantamento: Surpresa positiva? (5=sim, oferece valor extra)
- Objeções/Bugs: Aborda problemas? (5=identifica 3+ pontos)
- Rapport: Tom amigável, empatia? (5=conexão clara)
- Autoridade: Demonstra expertise? (5=casos, dados, best practices)
- Postura: Profissional, organizado? (5=muito bem estruturado)
- Gestão de Tempo: Respeita horário? (5=cumpre tudo no prazo)
- Contextualização: Conhece cliente? (5=referencia dados específicos)
- Clareza: Explica bem? (5=muito claro, sem jargão)
- Objetividade: Vai ao ponto? (5=foca problemas, sem desvios)
- Flexibilidade: Adapta abordagem? (5=pivota conforme necessário)
- Domínio de Produto: Conhece Nibo? (5=cita features com precisão)
- Domínio de Negócio: Conhece contabilidade? (5=domínio completo)
- Ecossistema Nibo: Conhece integrações? (5=recomenda as certas)
- Universo Contábil: Conhece classificações? (5=domínio total)`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          media_final:            { type: Type.NUMBER },
          tempo_fala_cs_pct:      { type: Type.NUMBER },
          tempo_fala_cliente_pct: { type: Type.NUMBER },
          nota_consultividade:    { type: Type.NUMBER },
          nota_escuta_ativa:      { type: Type.NUMBER },
          nota_jornada_cliente:   { type: Type.NUMBER },
          nota_encantamento:      { type: Type.NUMBER },
          nota_objecoes:          { type: Type.NUMBER },
          nota_rapport:           { type: Type.NUMBER },
          nota_autoridade:        { type: Type.NUMBER },
          nota_postura:           { type: Type.NUMBER },
          nota_gestao_tempo:      { type: Type.NUMBER },
          nota_contextualizacao:  { type: Type.NUMBER },
          nota_clareza:           { type: Type.NUMBER },
          nota_objetividade:      { type: Type.NUMBER },
          nota_flexibilidade:     { type: Type.NUMBER },
          nota_dominio_produto:   { type: Type.NUMBER },
          nota_dominio_negocio:   { type: Type.NUMBER },
          nota_ecossistema_nibo:  { type: Type.NUMBER },
          nota_universo_contabil: { type: Type.NUMBER },
          ck_prazo:               { type: Type.BOOLEAN },
          ck_dever_casa:          { type: Type.BOOLEAN },
          ck_certificado:         { type: Type.BOOLEAN },
          ck_proximo_passo:       { type: Type.BOOLEAN },
          ck_dor_vendas:          { type: Type.BOOLEAN },
          ck_suporte:             { type: Type.BOOLEAN },
        },
        required: [
          'media_final', 'tempo_fala_cs_pct', 'tempo_fala_cliente_pct',
          'nota_consultividade', 'nota_escuta_ativa', 'nota_jornada_cliente',
          'nota_encantamento', 'nota_objecoes', 'nota_rapport', 'nota_autoridade',
          'nota_postura', 'nota_gestao_tempo', 'nota_contextualizacao', 'nota_clareza',
          'nota_objetividade', 'nota_flexibilidade', 'nota_dominio_produto',
          'nota_dominio_negocio', 'nota_ecossistema_nibo', 'nota_universo_contabil',
          'ck_prazo', 'ck_dever_casa', 'ck_certificado',
          'ck_proximo_passo', 'ck_dor_vendas', 'ck_suporte',
        ],
      },
    },
    systemInstruction: systemPrompt,
  });

  const text = extractText(res);
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
      if (n < 1) n = 1;
      if (n > 5) n = 5;
      parsed['nota_' + k] = Math.round(n);
    }
  });

  parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
  parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';

  parsed.checklist_cs = {
    definiu_prazo_implementacao:  parsed.ck_prazo         || false,
    alinhou_dever_de_casa:        parsed.ck_dever_casa    || false,
    validou_certificado_digital:  parsed.ck_certificado   || false,
    agendou_proximo_passo:        parsed.ck_proximo_passo || false,
    conectou_com_dor_vendas:      parsed.ck_dor_vendas    || false,
    explicou_canal_suporte:       parsed.ck_suporte       || false,
  };

  return parsed;
}

// ─── CHAMADA 2: Meta-textos ────────────────────────────────────────────────
async function getMeta(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resumo_executivo: { type: Type.STRING },
          saude_cliente:    { type: Type.STRING },
          risco_churn:      { type: Type.STRING },
          sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
          pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
          pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['resumo_executivo', 'saude_cliente', 'risco_churn', 'sistemas_citados', 'pontos_fortes', 'pontos_atencao'],
      },
    },
    systemInstruction: `Notas: ${notasStr}. Retorne JSON. resumo=1 frase. saude/churn=1 frase. sistemas=lista. fortes/atencao=máx 4 itens curtos.`,
  });

  const text = extractText(res);
  return safeParse(text, 'getMeta');
}

// ─── CHAMADA 3A: Justificativas 1-9 ────────────────────────────────────────
async function getTextsA(transcript, numbers) {
  const group = ALL_PILLARS.slice(0, 9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 3000,
      responseSchema: makeTextSchema(group),
    },
    systemInstruction: `Notas: ${notasStr}. Para sem evidência: porque="Sem evidência na transcrição." melhoria="". Para com evidência: porque=1-2 frases (fato objetivo). melhoria=1 frase (o que faltou para 5, ou "Excelência atingida.").`,
  });

  const text = extractText(res);
  return safeParse(text, 'getTextsA');
}

// ─── CHAMADA 3B: Justificativas 10-17 ───────────────────────────────────────
async function getTextsB(transcript, numbers) {
  const group = ALL_PILLARS.slice(9);
  const notasStr = group
    .filter(p => numbers['nota_' + p[0]] !== null)
    .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5')
    .join(', ');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 3000,
      responseSchema: makeTextSchema(group),
    },
    systemInstruction: `Notas: ${notasStr}. Para sem evidência: porque="Sem evidência na transcrição." melhoria="". Para com evidência: porque=1-2 frases (fato objetivo). melhoria=1 frase (o que faltou para 5, ou "Excelência atingida.").`,
  });

  const text = extractText(res);
  return safeParse(text, 'getTextsB');
}

// ─── CHAMADA 4: Relatório ──────────────────────────────────────────────────
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
  const prompt = `Feedback de CS. ${coordinatorLine}NOTAS:\n${linhas}\n\nMédia: ${numbers.media_final}/5 | Saúde: ${meta.saude_cliente} | Churn: ${meta.risco_churn}\n\n## O que fez bem\n## O que melhorar\n## O que falar no 1:1\n## Plano de ação`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
    systemInstruction: `Coordenador CS do Nibo. Markdown puro, direto. "O que falar": frases prontas. "Plano": máx 3 prioridades.`,
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
    console.log('📝 Analisando transcrição...');
    
    const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers', 2);
    console.log('✅ Notas obtidas');

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
        texts['porque_'   + k] = 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = null;
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
    console.error('❌ Erro na API:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Erro ao analisar transcrição',
      details: error.message
    });
  }
}
