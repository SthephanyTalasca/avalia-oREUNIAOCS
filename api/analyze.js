import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 300;
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

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

function repairJson(raw) {
    let s = (raw || '').trimEnd().replace(/,\s*$/, '').replace(/"[^"]*$/, '').replace(/:\s*$/, '').replace(/,\s*$/, '');
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') braces++; else if (ch === '}') braces--;
        else if (ch === '[') brackets++; else if (ch === ']') brackets--;
    }
    while (brackets > 0) { s += ']'; brackets--; }
    while (braces > 0) { s += '}'; braces--; }
    return s;
}

function safeParse(text, label) {
    try { return JSON.parse(text); } catch (_) {
        try { const r = JSON.parse(repairJson(text)); console.log(label + ' reparado'); return r; }
        catch (e2) { console.error(label + ' falhou:', (text || '').slice(-80)); throw new Error('JSON_FAIL_' + label); }
    }
}

function makeTextSchema(pairs) {
    const props = {}, req = [];
    pairs.forEach(p => {
        props['porque_'   + p[0]] = { type: Type.STRING };
        props['melhoria_' + p[0]] = { type: Type.STRING };
        req.push('porque_' + p[0], 'melhoria_' + p[0]);
    });
    return { type: Type.OBJECT, properties: props, required: req };
}

async function withRetry(fn, label, attempts = 3) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); } catch (e) {
            lastErr = e;
            console.error(label + ' tentativa ' + (i+1) + ':', e.message);
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw lastErr;
}

async function getNumbers(transcript) {
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            systemInstruction:
                'Auditor de CS do Nibo. Leia a transcrição de implementação/onboarding. ' +
                'Para cada pilar retorne nota 1-5. Sem evidência = -1. ' +
                'media_final = média das notas diferentes de -1. ' +
                'tempo_fala_cs_pct e tempo_fala_cliente_pct = inteiro 0-100.',
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
                    'media_final','tempo_fala_cs_pct','tempo_fala_cliente_pct',
                    'nota_consultividade','nota_escuta_ativa','nota_jornada_cliente',
                    'nota_encantamento','nota_objecoes','nota_rapport','nota_autoridade',
                    'nota_postura','nota_gestao_tempo','nota_contextualizacao','nota_clareza',
                    'nota_objetividade','nota_flexibilidade','nota_dominio_produto',
                    'nota_dominio_negocio','nota_ecossistema_nibo','nota_universo_contabil',
                    'ck_prazo','ck_dever_casa','ck_certificado','ck_proximo_passo','ck_dor_vendas','ck_suporte'
                ]
            }
        }
    });
    const parsed = safeParse(res.text, 'getNumbers');
    ALL_PILLARS.forEach(p => { if (parsed['nota_' + p[0]] === -1) parsed['nota_' + p[0]] = null; });
    parsed.tempo_fala_cs      = (parsed.tempo_fala_cs_pct      || 50) + '%';
    parsed.tempo_fala_cliente = (parsed.tempo_fala_cliente_pct || 50) + '%';
    parsed.checklist_cs = {
        definiu_prazo_implementacao: parsed.ck_prazo         || false,
        alinhou_dever_de_casa:       parsed.ck_dever_casa    || false,
        validou_certificado_digital: parsed.ck_certificado   || false,
        agendou_proximo_passo:       parsed.ck_proximo_passo || false,
        conectou_com_dor_vendas:     parsed.ck_dor_vendas    || false,
        explicou_canal_suporte:      parsed.ck_suporte       || false,
    };
    return parsed;
}

async function getMeta(transcript, numbers) {
    const notasStr = ALL_PILLARS
        .filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'analista_nome: nome do analista de CS que conduz a reunião. ' +
                'pontos_fortes e pontos_atencao: máx 4 itens cada, frases curtas. ' +
                'sistemas_citados: ferramentas/sistemas mencionados pelo cliente. ' +
                'resumo_executivo: 1 frase. saude_cliente: 1 frase. risco_churn: 1 frase.',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    analista_nome:    { type: Type.STRING },
                    resumo_executivo: { type: Type.STRING },
                    saude_cliente:    { type: Type.STRING },
                    risco_churn:      { type: Type.STRING },
                    sistemas_citados: { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_fortes:    { type: Type.ARRAY, items: { type: Type.STRING } },
                    pontos_atencao:   { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['analista_nome','resumo_executivo','saude_cliente','risco_churn',
                           'sistemas_citados','pontos_fortes','pontos_atencao']
            }
        }
    });
    return safeParse(res.text, 'getMeta');
}

async function getTextsA(transcript, numbers) {
    const group = ALL_PILLARS.slice(0, 9);
    const notasStr = group.filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'Para pilares SEM evidência: porque = "Sem evidência na transcrição." e melhoria = "". ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5: "Excelência atingida.").',
            responseSchema: makeTextSchema(group)
        }
    });
    return safeParse(res.text, 'getTextsA');
}

async function getTextsB(transcript, numbers) {
    const group = ALL_PILLARS.slice(9);
    const notasStr = group.filter(p => numbers['nota_' + p[0]] !== null)
        .map(p => p[1] + ': ' + numbers['nota_' + p[0]] + '/5').join(', ');
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: transcript,
        config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 3000,
            systemInstruction:
                'Auditor de CS do Nibo. Notas: ' + notasStr + '. ' +
                'Para pilares SEM evidência: porque = "Sem evidência na transcrição." e melhoria = "". ' +
                'Para os demais: porque = 1 frase curta do que aconteceu; ' +
                'melhoria = 1 frase do que faltou para nota 5 (se nota=5: "Excelência atingida.").',
            responseSchema: makeTextSchema(group)
        }
    });
    return safeParse(res.text, 'getTextsB');
}

async function getRelatorio(numbers, meta, texts) {
    const linhas = ALL_PILLARS.map(p => {
        const nota = numbers['nota_' + p[0]];
        if (nota === null) return null;
        const pq = texts['porque_' + p[0]] || '';
        const ml = texts['melhoria_' + p[0]] || '';
        const suf = (ml && ml !== 'Excelência atingida.') ? ' | Melhoria: ' + ml : '';
        return '- **' + p[1] + '**: ' + nota + '/5 — ' + pq + suf;
    }).filter(Boolean).join('\n');

    const prompt =
        'Coordenador de CS do Nibo — feedback sobre o analista desta reunião de implementação.\n\n' +
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
            systemInstruction:
                'Coordenador sênior de CS do Nibo. Markdown puro, linguagem direta e humana. ' +
                '"O que falar no 1:1": frases prontas para usar literalmente. ' +
                '"Plano de ação": máx 3 prioridades com ação + prazo + métrica. ' +
                'Só mencione pilares com nota numérica.',
        }
    });
    return res.text || '';
}

function getSession(req) {
    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/nibo_cs_session=([^;]+)/);
    if (!match) return null;
    try {
        const s = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        if (s.exp && Date.now() > s.exp) return null;
        if (s.email.toLowerCase().split('@')[1] !== 'nibo.com.br') return null;
        return s;
    } catch { return null; }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    if (!getSession(req)) return res.status(401).json({ error: 'Não autorizado.' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Transcrição obrigatória.' });

    try {
        const numbers = await withRetry(() => getNumbers(prompt), 'getNumbers');
        const [meta, textsA, textsB] = await Promise.all([
            withRetry(() => getMeta(prompt, numbers), 'getMeta'),
            withRetry(() => getTextsA(prompt, numbers), 'getTextsA'),
            withRetry(() => getTextsB(prompt, numbers), 'getTextsB'),
        ]);
        const texts = Object.assign({}, textsA, textsB);

        ALL_PILLARS.forEach(p => {
            if (numbers['nota_' + p[0]] === null) {
                texts['porque_'   + p[0]] = 'Sem evidência na transcrição.';
                texts['melhoria_' + p[0]] = null;
            } else {
                texts['porque_'   + p[0]] = texts['porque_'   + p[0]] || 'Sem justificativa disponível.';
                texts['melhoria_' + p[0]] = texts['melhoria_' + p[0]] || 'Excelência atingida.';
            }
        });

        meta.analista_nome    = meta.analista_nome    || 'Não identificado';
        meta.resumo_executivo = meta.resumo_executivo || 'Reunião de implementação realizada.';
        meta.saude_cliente    = meta.saude_cliente    || 'Não avaliado.';
        meta.risco_churn      = meta.risco_churn      || 'Não avaliado.';
        meta.sistemas_citados = meta.sistemas_citados || [];
        meta.pontos_fortes    = meta.pontos_fortes    || [];
        meta.pontos_atencao   = meta.pontos_atencao   || [];

        const justificativa_detalhada = await withRetry(
            () => getRelatorio(numbers, meta, texts), 'getRelatorio'
        );

        return res.status(200).json(
            Object.assign({}, numbers, meta, texts, { justificativa_detalhada })
        );
    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: 'Erro: ' + error.message });
    }
}
// api/analyze.js
// ─────────────────────────────────────────────────────────────────────────────
// NOVA ESTRUTURA DE AVALIAÇÃO (3 etapas, 8 critérios)
//
//  Etapa 1 – Consultividade / Diagnóstico - SPIN
//    • SPIN          (nota_spin)
//    • Comunicação   (nota_comunicacao)
//    • Interação     (nota_interacao)
//    → nota_etapa1   salva em: nota_rapport (coluna existente)
//
//  Etapa 2 – Apresentação da Ferramenta
//    • Objeções      (nota_objecoes)
//    • Solução da dor(nota_solucao_dor)
//    → nota_etapa2   salva em: nota_produto (coluna existente)
//
//  Etapa 3 – Negociação
//    • Escuta ativa  (nota_escuta_ativa)
//    • Resiliência   (nota_resiliencia)
//    • Gestão do tempo (nota_gestao_tempo)
//    → nota_etapa3   salva em: nota_apresentacao (coluna existente)
//
//  media_final = média dos 8 critérios
//
//  REGRA MAL QUALIFICADO:
//    Se qual_veredicto contém "MAL" ou "FORA", a reunião não contabiliza
//    na média do vendedor (tratado em api/dashboard.js e api/save.js).
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI, Type } from '@google/genai';

export const maxDuration = 60;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método não permitido. Use POST." });
    }

    // ── Verificar sessão ────────────────────────────────────────────────────
    const cookie = req.headers.cookie || '';
    const match  = cookie.match(/nibo_session=([^;]+)/);
    if (!match) return res.status(401).json({ error: "Não autorizado." });
    try {
        const session = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        if (!session.exp || Date.now() > session.exp) return res.status(401).json({ error: "Sessão expirada." });
        const domain = session.email.toLowerCase().split('@')[1];
        if (domain !== 'nibo.com.br') return res.status(403).json({ error: "Acesso negado." });
    } catch { return res.status(401).json({ error: "Sessão inválida." }); }
    // ────────────────────────────────────────────────────────────────────────

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "O texto da transcrição é obrigatório." });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const systemInstruction = process.env.SYSTEM_PROMPT;
        if (!systemInstruction) return res.status(500).json({ error: "Prompt não configurado no servidor." });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                maxOutputTokens: 65536,
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {

                        // ── IDENTIFICAÇÃO ────────────────────────────────────
                        vendedor_nome:           { type: Type.STRING },
                        media_final:             { type: Type.NUMBER },
                        resumo_executivo:        { type: Type.STRING },
                        chance_fechamento:       { type: Type.STRING },
                        alerta_cancelamento:     { type: Type.STRING },
                        concorrentes_detectados: { type: Type.ARRAY, items: { type: Type.STRING } },

                        // ── ETAPA 1 — Consultividade / Diagnóstico - SPIN ────
                        nota_spin:              { type: Type.NUMBER },   // 1-5
                        porque_spin:            { type: Type.STRING },
                        melhoria_spin:          { type: Type.STRING },

                        nota_comunicacao:       { type: Type.NUMBER },   // 1-5
                        porque_comunicacao:     { type: Type.STRING },
                        melhoria_comunicacao:   { type: Type.STRING },

                        nota_interacao:         { type: Type.NUMBER },   // 1-5
                        porque_interacao:       { type: Type.STRING },
                        melhoria_interacao:     { type: Type.STRING },

                        nota_etapa1:            { type: Type.NUMBER },   // avg(spin+com+int)
                        porque_etapa1:          { type: Type.STRING },   // síntese da etapa
                        melhoria_etapa1:        { type: Type.STRING },

                        // ── ETAPA 2 — Apresentação da Ferramenta ─────────────
                        nota_objecoes:          { type: Type.NUMBER },   // 1-5
                        porque_objecoes:        { type: Type.STRING },
                        melhoria_objecoes:      { type: Type.STRING },

                        nota_solucao_dor:       { type: Type.NUMBER },   // 1-5
                        porque_solucao_dor:     { type: Type.STRING },
                        melhoria_solucao_dor:   { type: Type.STRING },

                        nota_etapa2:            { type: Type.NUMBER },   // avg(obj+sol)
                        porque_etapa2:          { type: Type.STRING },
                        melhoria_etapa2:        { type: Type.STRING },

                        // ── ETAPA 3 — Negociação ─────────────────────────────
                        nota_escuta_ativa:      { type: Type.NUMBER },   // 1-5
                        porque_escuta_ativa:    { type: Type.STRING },
                        melhoria_escuta_ativa:  { type: Type.STRING },

                        nota_resiliencia:       { type: Type.NUMBER },   // 1-5
                        porque_resiliencia:     { type: Type.STRING },
                        melhoria_resiliencia:   { type: Type.STRING },

                        nota_gestao_tempo:      { type: Type.NUMBER },   // 1-5
                        porque_gestao_tempo:    { type: Type.STRING },
                        melhoria_gestao_tempo:  { type: Type.STRING },

                        nota_etapa3:            { type: Type.NUMBER },   // avg(esc+res+ges)
                        porque_etapa3:          { type: Type.STRING },
                        melhoria_etapa3:        { type: Type.STRING },

                        // ── EXTRAS ───────────────────────────────────────────
                        tempo_fala_consultor:   { type: Type.NUMBER },
                        tempo_fala_cliente:     { type: Type.NUMBER },

                        checklist_fechamento: {
                            type: Type.OBJECT,
                            properties: {
                                resolveu_pontos_iniciais:             { type: Type.BOOLEAN },
                                pediu_feedback_ferramenta:            { type: Type.BOOLEAN },
                                pediu_voto_confianca:                 { type: Type.BOOLEAN },
                                tratou_objecao_socio:                 { type: Type.BOOLEAN },
                                validou_mensalidade_vs_setup:         { type: Type.BOOLEAN },
                                mencionou_gestao_financeira_gratuita: { type: Type.BOOLEAN }
                            }
                        },

                        pontos_fortes:          { type: Type.ARRAY, items: { type: Type.STRING } },
                        pontos_atencao:         { type: Type.ARRAY, items: { type: Type.STRING } },
                        justificativa_detalhada: { type: Type.STRING },

                        // ── QUALIFICAÇÃO SDR ─────────────────────────────────
                        qual_produto_identificado:  { type: Type.STRING },
                        qual_produto_no_portfolio:  { type: Type.BOOLEAN },
                        qual_produto_alerta:        { type: Type.STRING },
                        qual_contexto: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    valor: { type: Type.STRING }
                                }
                            }
                        },
                        qual_sabia_o_que_veria:   { type: Type.BOOLEAN },
                        qual_sabia_evidencia:     { type: Type.STRING },
                        qual_produto_correto:     { type: Type.BOOLEAN },
                        qual_produto_evidencia:   { type: Type.STRING },
                        qual_interesse_real:      { type: Type.BOOLEAN },
                        qual_interesse_evidencia: { type: Type.STRING },
                        qual_cenario_diagnosticado: { type: Type.BOOLEAN },
                        qual_cenario_evidencia:     { type: Type.STRING },

                        qual_sla_1_label: { type: Type.STRING },
                        qual_sla_1_ok:    { type: Type.BOOLEAN },
                        qual_sla_1_ev:    { type: Type.STRING },
                        qual_sla_2_label: { type: Type.STRING },
                        qual_sla_2_ok:    { type: Type.BOOLEAN },
                        qual_sla_2_ev:    { type: Type.STRING },
                        qual_sla_3_label: { type: Type.STRING },
                        qual_sla_3_ok:    { type: Type.BOOLEAN },
                        qual_sla_3_ev:    { type: Type.STRING },

                        qual_veredicto:              { type: Type.STRING },
                        qual_nota_sdr:               { type: Type.NUMBER },
                        qual_nota_sdr_justificativa: { type: Type.STRING },
                        qual_analise_completa:       { type: Type.STRING }
                    },
                    required: [
                        "vendedor_nome", "media_final", "resumo_executivo", "chance_fechamento", "alerta_cancelamento",
                        "concorrentes_detectados",

                        // Etapa 1
                        "nota_spin", "porque_spin", "melhoria_spin",
                        "nota_comunicacao", "porque_comunicacao", "melhoria_comunicacao",
                        "nota_interacao", "porque_interacao", "melhoria_interacao",
                        "nota_etapa1", "porque_etapa1", "melhoria_etapa1",

                        // Etapa 2
                        "nota_objecoes", "porque_objecoes", "melhoria_objecoes",
                        "nota_solucao_dor", "porque_solucao_dor", "melhoria_solucao_dor",
                        "nota_etapa2", "porque_etapa2", "melhoria_etapa2",

                        // Etapa 3
                        "nota_escuta_ativa", "porque_escuta_ativa", "melhoria_escuta_ativa",
                        "nota_resiliencia", "porque_resiliencia", "melhoria_resiliencia",
                        "nota_gestao_tempo", "porque_gestao_tempo", "melhoria_gestao_tempo",
                        "nota_etapa3", "porque_etapa3", "melhoria_etapa3",

                        "tempo_fala_consultor", "tempo_fala_cliente",
                        "checklist_fechamento", "pontos_fortes", "pontos_atencao",
                        "justificativa_detalhada",

                        "qual_produto_identificado", "qual_produto_no_portfolio", "qual_produto_alerta",
                        "qual_contexto",
                        "qual_sabia_o_que_veria", "qual_sabia_evidencia",
                        "qual_produto_correto", "qual_produto_evidencia",
                        "qual_interesse_real", "qual_interesse_evidencia",
                        "qual_cenario_diagnosticado", "qual_cenario_evidencia",
                        "qual_sla_1_label", "qual_sla_1_ok", "qual_sla_1_ev",
                        "qual_sla_2_label", "qual_sla_2_ok", "qual_sla_2_ev",
                        "qual_sla_3_label", "qual_sla_3_ok", "qual_sla_3_ev",
                        "qual_veredicto", "qual_nota_sdr", "qual_nota_sdr_justificativa",
                        "qual_analise_completa"
                    ]
                }
            }
        });

        let analysisData;
        try {
            const rawText = typeof response.text === 'function' ? response.text() : response.text;
            console.log("RAW length:", rawText?.length, "| first 100:", rawText?.substring(0,100));
            analysisData = JSON.parse(rawText);
        } catch (parseError) {
            const rawText = typeof response.text === 'function' ? response.text() : response.text;
            console.error("Parse error:", parseError.message, "| raw:", rawText?.substring(0,300));
            return res.status(500).json({ error: "Erro ao processar resposta da IA: " + parseError.message });
        }

        // ── Inject UI config (hidden from frontend source) ─────────────────
        analysisData._config = {
            // 3 estágios substituem os 5 pilares antigos
            fields: [
                {
                    l: 'Consultividade / SPIN',
                    k: 'etapa1',
                    icon: 'search',
                    color: 'blue',
                    criterios: [
                        { l: 'SPIN', k: 'spin',        desc: 'Realizou perguntas de Situação, Problema, Implicação e Necessidade?' },
                        { l: 'Comunicação Eficaz', k: 'comunicacao', desc: 'Demonstrou capacidade de ouvir as dores e o cenário do cliente?' },
                        { l: 'Interação',  k: 'interacao',   desc: 'Utilizou vocabulário adequado garantindo comunicação saudável?' }
                    ]
                },
                {
                    l: 'Apresentação da Ferramenta',
                    k: 'etapa2',
                    icon: 'presentation',
                    color: 'violet',
                    criterios: [
                        { l: 'Objeções',      k: 'objecoes',    desc: 'Conseguiu contornar objeções de maneira amistosa e convincente?' },
                        { l: 'Solução da Dor', k: 'solucao_dor', desc: 'Utilizou a dor identificada no diagnóstico para mostrar a solução?' }
                    ]
                },
                {
                    l: 'Negociação',
                    k: 'etapa3',
                    icon: 'handshake',
                    color: 'emerald',
                    criterios: [
                        { l: 'Escuta Ativa',     k: 'escuta_ativa',  desc: 'Exerceu escuta ativa com pausas necessárias para feedback do lead?' },
                        { l: 'Resiliência',      k: 'resiliencia',   desc: 'Demonstrou firmeza com bons argumentos para fechamento ou próximo contato?' },
                        { l: 'Gestão do Tempo',  k: 'gestao_tempo',  desc: 'Conseguiu boa gestão do tempo garantindo call de qualidade em 60 min?' }
                    ]
                }
            ],
            prodConfig: {
                'RADAR-ECAC':       { color: 'bg-sky-100 text-sky-800 border-sky-300',             icon: 'radar' },
                'NIBO OBRIGAÇÕES':  { color: 'bg-violet-100 text-violet-800 border-violet-300',    icon: 'file-text' },
                'CONCILIADOR':      { color: 'bg-blue-100 text-blue-800 border-blue-300',          icon: 'git-merge' },
                'WHATSAPP WEB':     { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'message-circle' },
                'EMISSOR DE NOTAS': { color: 'bg-orange-100 text-orange-800 border-orange-300',    icon: 'file-plus' },
                'FORA':             { color: 'bg-red-100 text-red-800 border-red-300',             icon: 'alert-triangle' }
            },
            ckLabels: {
                resolveu_pontos_iniciais:             'Retomou problemas',
                pediu_feedback_ferramenta:            'Pediu Feedback',
                pediu_voto_confianca:                 'Voto de Confiança',
                tratou_objecao_socio:                 'Alinhou Sócios',
                validou_mensalidade_vs_setup:         'Isolou Objeção',
                mencionou_gestao_financeira_gratuita: 'Cereja do Bolo'
            }
        };

        // ── Flag de mal qualificado para uso no save ──────────────────────
        const veredicto = (analysisData.qual_veredicto || '').toUpperCase();
        analysisData._mal_qualificado = veredicto.includes('MAL') || veredicto.includes('FORA');

        return res.status(200).json(analysisData);

    } catch (error) {
        console.error("Erro na API:", error);
        return res.status(500).json({ error: "Erro do Google Gemini: " + error.message });
    }
}
