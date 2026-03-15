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

// ─── Extração robusta de texto de qualquer resposta ─────────────────────────
function extractText(response) {
  // console.log('📦 Response type:', typeof response, Array.isArray(response));
  
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
  
  // Se tiver .text
  if (typeof response?.text === 'string') return response.text;
  
  // Se tiver .candidates (formato novo do Gemini)
  if (Array.isArray(response?.candidates)) {
    const candidate = response.candidates[0];
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }
  }
  
  // Último recurso
  const str = JSON.stringify(response);
  console.warn('⚠️  Conversão para string:', str.substring(0, 200));
  return str;
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
  
  try { 
    return JSON.parse(text); 
  } catch (e1) {
    console.warn(`⚠️  ${label} JSON inválido, tentando reparar...`);
    try {
      const repaired = repairJson(text);
      const result = JSON.parse(repaired);
      console.log(`✅ ${label} reparado com sucesso`);
      return result;
    } catch (e2) {
      console.error(`❌ ${label} falhou mesmo após repair`);
      console.error('Texto original:', text.substring(0, 300));
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
// CHAMADA 1: NOTAS NUMÉRICAS (SEM SCHEMA JSON - TEXT MODE)
// ═══════════════════════════════════════════════════════════════════════════════
async function getNumbers(transcript) {
  const systemPrompt = `Você é um auditor de CS expert do Nibo. Avalie a transcrição e retorne JSON válido.

RESPONDA COM JSON PURO (sem markdown, sem backticks):
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
  "ck_prazo": true/false,
  "ck_dever_casa": true/false,
  "ck_certificado": true/false,
  "ck_proximo_passo": true/false,
  "ck_dor_vendas": true/false,
  "ck_suporte": true/false
}

REGRAS:
- -1 = sem evidência na transcrição
- 1-5 = notas reais
- media_final = média dos valores 1-5 (ignorar -1)
- DETERMINÍSTICO: mesma transcrição = mesmas notas
- Arredonde notas para inteiro (1-5)

CRITÉRIOS POR PILAR:
- Consultividade: Recomenda soluções? (5=assertivo, 1=apenas responde)
- Escuta Ativa: Pergunta aberta? Cliente fala? (5=40%+ cliente, -1=praticamente não fala)
- Jornada do Cliente: Próximos passos claros? (5=roadmap com datas)
- Encantamento: Oferece valor extra? (5=sim, surpresa positiva)
- Objeções/Bugs: Aborda problemas? (5=identifica 3+)
- Rapport: Tom amigável, empatia? (5=conexão clara)
- Autoridade: Demonstra expertise? (5=cases, dados, best practices)
- Postura: Profissional, organizado? (5=muito estruturado)
- Gestão de Tempo: Respeita horário? (5=cumpre tudo)
- Contextualização: Conhece cliente? (5=referencia dados específicos)
- Clareza: Explica bem? (5=muito claro, sem jargão)
- Objetividade: Vai ao ponto? (5=foca problemas)
- Flexibilidade: Adapta? (5=pivota conforme necessário)
- Domínio de Produto: Conhece Nibo? (5=cita features com precisão)
- Domínio de Negócio: Conhece contabilidade? (5=domínio total)
- Ecossistema Nibo: Conhece integrações? (5=recomenda certas)
- Universo Contábil: Conhece classificações? (5=domínio completo)`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
    systemInstruction: systemPrompt,
  });

  const text = extractText(res);
  console.log('📦 Resposta bruta getNumbers (primeiros 300 chars):', text.substring(0, 300));
  
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

Retorne JSON PURO:
{
  "resumo_executivo": "1 frase sobre o onboarding",
  "saude_cliente": "1 frase sobre saúde do cliente",
  "risco_churn": "1 frase sobre risco de churn",
  "sistemas_citados": ["sistema1", "sistema2"],
  "pontos_fortes": ["ponto1", "ponto2"],
  "pontos_atencao": ["atenção1", "atenção2"]
}

Requisitos:
- pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas
- sistemas_citados: APENAS ferramentas mencionadas explicitamente
- resumo/saude/churn: 1 frase concisa cada`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
    systemInstruction: 'Retorne APENAS JSON válido. Sem markdown, sem backticks, sem explicações. JSON puro.',
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

Retorne JSON PURO com porque_ e melhoria_ para cada pilar:
{
  "porque_consultividade": "...",
  "melhoria_consultividade": "...",
  "porque_escuta_ativa": "...",
  "melhoria_escuta_ativa": "...",
  ... (repita para todos os 9 pilares)
}

Regras:
- Se -1 (sem evidência): porque="Sem evidência na transcrição." melhoria=""
- Se tem nota: porque=1-2 frases (fato objetivo). melhoria=1 frase (o que faltou para 5, ou "Excelência atingida.")`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
    },
    systemInstruction: 'Retorne APENAS JSON válido. Sem markdown, sem backticks. JSON puro.',
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

Retorne JSON PURO:
{
  "porque_contextualizacao": "...",
  "melhoria_contextualizacao": "...",
  ... (repita para os 8 pilares restantes)
}

Regras:
- Se -1: porque="Sem evidência na transcrição." melhoria=""
- Se tem nota: porque=1-2 frases (fato objetivo). melhoria=1 frase`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3000,
    },
    systemInstruction: 'Retorne APENAS JSON válido. JSON puro, sem markdown.',
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
    
    const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers', 2);
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
    return res.status(500).json({ 
      error: error.message || 'Erro ao analisar transcrição'
    });
  }
}
