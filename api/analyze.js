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

// ─── Repara JSON truncado fechando estruturas abertas ─────────────────────────────
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
  try { return JSON.parse(text); } catch (*) {
    try {
      const r = JSON.parse(repairJson(text));
      console.log(label + ' reparado OK');
      return r;
    } catch (e2) {
      console.error(label + ' falhou mesmo após repair:', (text || '').slice(-80));
      throw new Error('JSON_FAIL*' + label);
    }
  }
}

// ─── Monta schema de justificativas para N pilares ────────────────────────────
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

// ─── Retry automático para chamadas à API ─────────────────────────────────────
async function withRetry(fn, label, attempts) {
  attempts = attempts || 3;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(label + ' tentativa ' + (i + 1) + ' falhou:', e.message);
      if (i < attempts - 1) {
        await new Promise(function(r) { setTimeout(r, 1000 * (i + 1)); });
      }
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAMADA 1: NOTAS NUMÉRICAS + CHECKLIST (ULTRA-ESTÁVEL, temperature=0.1)
// ═══════════════════════════════════════════════════════════════════════════════
async function getNumbers(transcript) {
  const systemPrompt = `Você é um AUDITOR DE CS EXPERIENTE do Nibo. Sua tarefa é avaliar transcrições de reuniões de onboarding.

REGRAS RÍGIDAS:
- Avalie APENAS o que está EXPLICITAMENTE na transcrição
- Se não houver evidência clara = -1 (sem evidência)
- Notas: 1 = Péssimo, 2 = Fraco, 3 = Adequado, 4 = Bom, 5 = Excelente
- Não varie as notas arbitrariamente - seja CONSISTENTE e OBJETIVO
- Se a mesma transcrição for analisada novamente, as notas DEVEM ser idênticas

CRITÉRIOS OBJETIVO POR PILAR:
- Consultividade: Recomenda soluções vs apenas responde? (5=recomenda soluções assertivas)
- Escuta Ativa: Faz perguntas abertas? Deixa cliente falar? (5=faz perguntas relevantes, 40%+ cliente fala)
- Jornada do Cliente: Conhece próximos passos? Alinha expectativas? (5=roadmap claro + datas)
- Encantamento: Surpresa positiva? Vai além? (5=oferece algo inesperado/valor extra)
- Objeções/Bugs: Aborda problemas do cliente? (5=identifica e resolve 3+ pontos críticos)
- Rapport: Tom amigável? Empatia? (5=conexão pessoal clara + ajustes de tom)
- Autoridade: Demonstra expertise? Confiança? (5=cita casos, dados, best practices)
- Postura: Profissional? Organizado? (5=estruturado, pontual, bem preparado)
- Gestão de Tempo: Respeita horário? Cumpre agenda? (5=termina no prazo com tudo pronto)
- Contextualização: Conhece o cliente? Seu negócio? (5=referencia dados específicos do cliente)
- Clareza: Explica bem? Sem jargão? (5=muito claro, sem termos técnicos desnecessários)
- Objetividade: Vai ao ponto? Sem desvios? (5=foca nos problemas, sem digressões)
- Flexibilidade: Adapta abordagem? Ouve sugestões? (5=pivota conforme necessário)
- Domínio de Produto: Conhece Nibo? Funcionalidades? (5=cita features específicas com precisão)
- Domínio de Negócio: Conhece contabilidade/fiscal? (5=entende processos contábeis do cliente)
- Ecossistema Nibo: Conhece integrações? Parceiros? (5=recomenda integrações relevantes)
- Universo Contábil: Conhece o espectro contábil? (5=domínio completo de classificações)

IMPORTANTE: Estas notas devem ser DETERMINÍSTICAS. A mesma transcrição sempre gera as mesmas notas.`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: transcript,
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.1, // ULTRA-BAIXO para determinismo
      systemInstruction: systemPrompt,
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
  });

  const parsed = safeParse(res.text, 'getNumbers');

  // Converte -1 para null
  ALL_PILLARS.forEach(function(p) {
    if (parsed['nota_' + p[0]] === -1) parsed['nota_' + p[0]] = null;
  });

  // Validação: força notas entre 1-5 (ou null)
  ALL_PILLARS.forEach(function(p) {
    const k = p[0];
    const n = parsed['nota_' + k];
    if (n !== null && n !== undefined) {
      if (n < 1) parsed['nota_' + k] = 1;
      if (n > 5) parsed['nota_' + k] = 5;
      // Arredonda para número inteiro para mais consistência
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

// ─── CHAMADA 2: meta-textos (resumo, saúde, sistemas, pontos) ─────────────────
async function getMeta(transcript, numbers) {
  const notasStr = ALL_PILLARS
    .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
    .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
    .join(', ');

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: transcript,
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
      temperature: 0.2, // Bem baixa
      systemInstruction:
        'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
        'Retorne JSON com campos solicitados. ' +
        'pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas diretas. ' +
        'sistemas_citados: ferramentas/sistemas mencionados EXPLICITAMENTE. ' +
        'resumo_executivo: 1 frase concisa. saude_cliente: 1 frase. risco_churn: 1 frase.',
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
        required: ['resumo_executivo', 'saude_cliente', 'risco_churn',
                   'sistemas_citados', 'pontos_fortes', 'pontos_atencao'],
      },
    },
  });

  return safeParse(res.text, 'getMeta');
}

// ─── CHAMADA 3A: justificativas pilares 1-9 (temperature=0.1) ───────────────────
async function getTextsA(transcript, numbers) {
  const group = ALL_PILLARS.slice(0, 9);
  const notasStr = group
    .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
    .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
    .join(', ');

  const instruction =
    'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
    'Para pilares SEM evidência: porque="Sem evidência na transcrição." melhoria="". ' +
    'Para com evidência: ' +
    'porque = 1-2 frases descrevendo O QUE foi observado (fato objetivo). ' +
    'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelência atingida."). ' +
    'SEJA CONSISTENTE: mesma transcrição = mesma resposta.';

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: transcript,
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 3000,
      temperature: 0.1, // ULTRA-BAIXO
      systemInstruction: instruction,
      responseSchema: makeTextSchema(group),
    },
  });

  return safeParse(res.text, 'getTextsA');
}

// ─── CHAMADA 3B: justificativas pilares 10-17 (temperature=0.1) ────────────────
async function getTextsB(transcript, numbers) {
  const group = ALL_PILLARS.slice(9);
  const notasStr = group
    .filter(function(p) { return numbers['nota_' + p[0]] !== null; })
    .map(function(p)    { return p[1] + ': ' + numbers['nota_' + p[0]] + '/5'; })
    .join(', ');

  const instruction =
    'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
    'Para pilares SEM evidência: porque="Sem evidência na transcrição." melhoria="". ' +
    'Para com evidência: ' +
    'porque = 1-2 frases descrevendo O QUE foi observado (fato objetivo). ' +
    'melhoria = 1 frase do que faltou para nota 5 (se nota=5 escreva "Excelência atingida."). ' +
    'SEJA CONSISTENTE: mesma transcrição = mesma resposta.';

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: transcript,
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 3000,
      temperature: 0.1, // ULTRA-BAIXO
      systemInstruction: instruction,
      responseSchema: makeTextSchema(group),
    },
  });

  return safeParse(res.text, 'getTextsB');
}

// ─── CHAMADA 4: relatório (temperature=0.2, mais criativo mas ainda consistente) ──
async function getRelatorio(numbers, meta, texts, coordinator) {
  const linhas = ALL_PILLARS.map(function(p) {
    const k    = p[0];
    const nota = numbers['nota_' + k];
    if (nota === null) return null;
    const pq   = texts['porque_'   + k] || '';
    const ml   = texts['melhoria_' + k] || '';
    const suf  = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
    return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
  }).filter(Boolean).join('\n');

  const coordinatorLine = coordinator ? `Coordenador responsável: **${coordinator}**\n\n` : '';

  const prompt =
    'Coordenador de CS do Nibo — feedback sobre o analista desta reunião.\n\n' +
    coordinatorLine +
    'NOTAS:\n' + linhas + '\n\n' +
    'Média: ' + (numbers.media_final || '?') + '/5' +
    ' | Saúde: ' + (meta.saude_cliente || '') +
    ' | Churn: '  + (meta.risco_churn  || '') + '\n' +
    'Fortes: '  + (meta.pontos_fortes  || []).join('; ') + '\n' +
    'Atenção: ' + (meta.pontos_atencao || []).join('; ') + '\n\n' +
    '## O que o analista fez bem\n' +
    '## O que precisa melhorar\n' +
    '## O que falar no 1:1\n' +
    '## Plano de ação individual';

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.2,
      systemInstruction:
        'Coordenador sênior de CS do Nibo. Markdown puro, linguagem direta e humana. ' +
        '"O que falar no 1:1": frases prontas. ' +
        '"Plano de ação": máx 3 prioridades (ação + prazo + métrica). ' +
        'Só mencione pilares com nota numérica.',
    },
  });

  return res.text || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const prompt = req.body && req.body.prompt;
  const coordinator = req.body && req.body.coordinator;

  if (!prompt) {
    return res.status(400).json({ error: 'Transcrição obrigatória.' });
  }

  try {
    // 1. Notas numéricas (com retry)
    const numbers = await withRetry(function() { return getNumbers(prompt); }, 'getNumbers');

    // 2. Meta-textos + justificativas A e B em paralelo (com retry individual)
    const results = await Promise.all([
      withRetry(function() { return getMeta(prompt, numbers);   }, 'getMeta'),
      withRetry(function() { return getTextsA(prompt, numbers); }, 'getTextsA'),
      withRetry(function() { return getTextsB(prompt, numbers); }, 'getTextsB'),
    ]);
    const meta   = results[0];
    const textsA = results[1];
    const textsB = results[2];
    const texts  = Object.assign({}, textsA, textsB);

    // Garante fallbacks para pilares sem evidência ou campos faltando
    ALL_PILLARS.forEach(function(p) {
      const k = p[0];
      if (numbers['nota_' + k] === null) {
        texts['porque_'   + k] = 'Sem evidência na transcrição.';
        texts['melhoria_' + k] = null;
      } else {
        texts['porque_'   + k] = texts['porque_'   + k] || 'Sem justificativa disponível.';
        texts['melhoria_' + k] = texts['melhoria_' + k] || 'Excelência atingida.';
      }
    });

    // Fallbacks para meta
    meta.resumo_executivo = meta.resumo_executivo || 'Reunião de onboarding realizada.';
    meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
    meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
    meta.sistemas_citados = meta.sistemas_citados || [];
    meta.pontos_fortes    = meta.pontos_fortes    || [];
    meta.pontos_atencao   = meta.pontos_atencao   || [];

    // 3. Relatório (com retry) - agora passando o coordenador
    const justificativa_detalhada = await withRetry(
      function() { return getRelatorio(numbers, meta, texts, coordinator); }, 'getRelatorio'
    );

    return res.status(200).json(
      Object.assign({}, numbers, meta, texts, { 
        justificativa_detalhada: justificativa_detalhada,
        coordinator: coordinator 
      })
    );

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro: ' + error.message });
  }
}
